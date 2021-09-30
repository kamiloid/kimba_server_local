const {app_conf, db_conf, serve_conf} = require('../core/conf/conf.js');
const {tools} = require('../core/conf/tools.js');

exports.login =
{
	logout: async function(data)
	{
		data.o['logged'] = false;
		const db_session = await data.mysql.query(`SELECT uid, token FROM users_login WHERE ip = '${data.client.ip}' AND browser = '${data.client.browser}' AND status = '1' ORDER BY date_time DESC LIMIT 1`);
		if(db_session.result.length > 0)
		{
			let resp = await data.mysql.query(`UPDATE users_login SET status = '0', out_date = '${tools.date.date_time_read()}' WHERE uid = '${db_session.result[0].uid}';`);
			serve_conf.remove_session(db_session.result[0].token);
		}
		serve_conf.remove_session(data.i.token);
		data.o.session = {};
		return data.callback(data.o);
	},
	check_session: async function(data)
	{
		data.o['logged'] = false;
		// 1. get a opened session in server
		let session = serve_conf.check_session_by_ip_browser(data.client.ip, data.client.browser);
		// 2. check if the opened session exist
		// 2.1. if it does not exist, then we have to consult if the session is opened in the db
		//console.log('session: ', session);
		if(!session)
		{
			let resp = await data.lib.db_queries.get_db_session_by_ip_browser(data);

			if(resp.result.length == 0)
			{
				data.o.message = 'User is not logged currently.';
				return data.callback(data.o);
			}
			// console.log(resp);
			let result = resp.result[0];
			// 2.3 if the session exist, we have to know if this one is opened currently
			let today = tools.date.now();
			let expire = tools.date.date(result.expire_date);
			// 2.4 if the session is not opened, return logged as false
			if(today.getTime() > expire.getTime())
			{
				data.o.message = 'User is not logged currently.';
				return data.callback(data.o);
			}

			// 2.2 if the session does not exist in the db, then return logged as false
				
			// 2.5 if the session exists and is opened, we have to consult in the db the basic data of the user
			// 'token', 'expire_date', 'user_uid'
			let resp2 = await data.lib.db_queries.get_db_user_data(data, result.user_uid);
			if(resp2.result.length == 0)
			{
				data.o.message = 'User does not exist or is banned.';
				return data.callback(data.o);
			}
			let result2 = resp2.result[0];
			// 2.6 if the session exists and is opened, returns logged as true
			data.o.session['token'] = result.token;
			data.o.session['user_name'] = result2.user_name;
			data.o.session['first_name'] = result2.first_name;
			data.o.session['last_name'] = result2.last_name;
			data.o.session['email'] = result2.email;
			data.o.session['plan'] = result2.plan || 0;

			serve_conf.set_session({
				token: data.o.session['token'],
				user_uid: result.user_uid,
				expire: result.expire_date,
				user_name: data.o.session['user_name'],
				first_name: data.o.session['first_name'],
				last_name: data.o.session['last_name'],
				email: data.o.session['email'],
				ip: data.client.ip,
				browser: data.client.browser,
				plan: data.o.session['plan']
			}, result.token);
			data.o.logged = true;
			return data.callback(data.o);
		}else{
			// 3. if the session exist
			// 3.1 we have to compare the new token with the old token
			data.o.logged = false;
			let old_token = session.token;
			if(old_token !== data.i.token && (data.i.token !== null && data.i.token !== undefined))
			{
				serve_conf.remove_session(old_token);
				serve_conf.remove_session(data.i.token);
				data.o.message = 'Tokens do not match.';
				return data.callback(data.o);
			}
			// 3.2 we have to compare the expiring date
			let today = tools.date.now();
			let expire = session.expire;
			if(today.getTime() > expire.getTime())
			{
				serve_conf.remove_session(old_token);
				serve_conf.remove_session(data.i.token);
				data.o.message = 'The session is expired.';
				return data.callback(data.o);
			}
			// 3.3 we have to change the token
			data.lib.tokenizer.change_token(data, old_token, (resp)=>
			{
				data.o.session['token'] = resp;
				data.o.session['user_name'] = session.user_name;
				data.o.session['first_name'] = session.first_name;
				data.o.session['last_name'] = session.last_name;
				data.o.session['email'] = session.email;
				data.o.session['plan'] = session.plan;
				data.o.logged = true;

				return data.callback(data.o);
			});
		}
	},
	try: async (data)=>
	{
		let resp = await data.mysql.query(`SELECT uid, status, id, first_name, last_name, email, plan FROM users WHERE user_name = '${data.i.username}' AND pass = '${data.i.pass}' LIMIT 1;`)
		
		if(resp.result.length == 0)
		{
			data.o.error = true;
			data.o.message = 'User does not exist or is banned.';
			return data.callback(data.o);
		}
		
		let resp2 = await data.mysql.query(`SELECT token, expire_date FROM users_login WHERE ip = '${data.client.ip}' AND browser = '${data.client.browser}' AND user_uid = '${resp.result[0].uid}' AND status = '1' LIMIT 1;`);
		
		let create_session = true;
		let token = '';
		let now = tools.date.now();
		let expire_date = tools.date.add_days(now, app_conf._expire_date_days);
		if(resp2.result.length >= 1)
		{
			create_session = false;
			token = resp2.result[0].token;
			let expire_date = tools.date.date(resp2.result[0].expire_date);
			if(tools.date.now().getTime() > expire_date)
				create_session = true;
		}
		if(create_session)
		{
			let session_uid = tools.uid();
			token = tools.uid();
			let today_date_time = tools.date.date_time_read(now);
			let expire_date_time = tools.date.date_time_read(expire_date);
			await data.mysql.query(`INSERT INTO users_login (uid, user_uid, date_time, ip, expire_date, browser, token) VALUES ('${session_uid}', '${resp.result[0].uid}', '${today_date_time}', '${data.client.ip}', '${expire_date_time}', '${data.client.browser}', '${token}')`, (resp3)=>{});
		}

		serve_conf.set_session({
			token: token,
			user_uid: resp.result[0].uid,
			expire: expire_date,
			user_name: data.i.username,
			first_name: resp.result[0].first_name,
			last_name: resp.result[0].last_name,
			email: resp.result[0].email,
			ip: data.client.ip,
			browser: data.client.browser,
			plan: resp.result[0].plan
		}, token);
		
		data.o.session = {
			token: token,
			user_name: data.i.username,
			first_name: resp.result[0].first_name,
			last_name: resp.result[0].last_name,
			email: resp.result[0].email,
			plan: resp.result[0].plan
		}
		return data.callback(data.o);
	},
	signin: async (data)=>
	{
		let resp1 = await  data.mysql.query(`SELECT uid FROM users WHERE user_name = '${data.i.user_name}' OR email = '${data.i.email}';`);
		
		if(resp1.result.length >= 1)
		{
			data.o.error = true;
			data.o.message = 'User exist already';
			return data.callback(data.o);
		}else{
			let user_uid = tools.uid();
			let resp2 = await data.mysql.query(`INSERT INTO users (uid, user_name, pass, email, first_name, last_name, date_time) VALUES ('${user_uid}', '${data.i.user_name}', '${data.i.pass}', '${data.i.email}', '${data.i.first_name}', '${data.i.last_name}', '${tools.date.date_time_read()}');`);
			if(resp2.code_error) return data.callback({error: true, message: 'Error signing the user'});
			
			let dbid = resp2.id;
			return data.callback(data.o);
		}
	}
}
