const {app_conf, db_conf, serve_conf} = require('../core/conf/conf.js');
const {tools} = require('../core/conf/tools.js');
const {Session, Session_manager} = require('../core/conf/session.js');

exports.login =
{
	logout: async function(data)
	{
		data.o['logged'] = false;
		const session_temp = Session_manager.get_token(data.i.token);
		if(session_temp)
		{
			const resp = await data.lib.db_queries.logout(data, session_temp._id, tools.date.date_time_read());
			Session_manager.delete_session(session_temp._id);
		}
		const db_session = await data.lib.db_queries.get_db_session_by_ip_browser(data);
		if(db_session.length > 0)
		{
			const resp = await data.lib.db_queries.logout(data, db_session[0].uid, tools.date.date_time_read());
			Session_manager.delete_session(db_session[0].uid);
		}
		data.o.session = {};
		return data.callback(data.o);
	},
	check_session: async function(data)
	{
		data.o['logged'] = false;
		// 1. get a opened session in server
		// let session = serve_conf.check_session_by_ip_browser(data.client.ip, data.client.browser);
		let session = Session_manager.get_ip_browser(data.client.ip, data.client.browser);
		// 2. check if the opened session exist
		// 2.1. if it does not exist, then we have to consult if the session is opened in the db
		//console.log('session: ', session);
		if(!session)
		{
			const session_local_resp = await data.lib.db_queries.get_db_session_by_ip_browser(data);

			if(session_local_resp.length == 0)
			{
				data.o.message = 'User is not logged currently.';
				return data.callback(data.o);
			}
			const session_local = session_local_resp[0];
			// 2.3 if the session exist, we have to know if this one is opened currently
			const today = tools.date.now();
			const expire = tools.date.date(session_local.expire_date);
			// 2.4 if the session is not opened, return logged as false
			if(today.getTime() > expire.getTime())
			{
				data.o.message = 'User is not logged currently.';
				return data.callback(data.o);
			}

			// 2.2 if the session does not exist in the db, then return logged as false
				
			// 2.5 if the session exists and is opened, we have to consult in the db the basic data of the user
			// 'token', 'expire_date', 'user_uid'
			let user_data_resp = await data.lib.db_queries.get_db_user_data(data, session_local.user_uid);
			if(user_data_resp.result.length == 0)
			{
				data.o.message = 'User does not exist or is banned.';
				return data.callback(data.o);
			}

			const scopes_resp = await data.lib.db_queries.get_db_user_scope(data, session_local.user_uid);
			const scopes = scopes_resp[0];

			let user_data = user_data_resp.result[0];
			// 2.6 if the session exists and is opened, returns logged as true
			session = Session_manager.new_session(session_local.uid, {
				id: session_local.uid,
				token: session_local.token,
				user_uid: session_local.user_uid,
				expire: session_local.expire_date,
				user_name: user_data.user_name,
				first_name: user_data.first_name,
				last_name: user_data.last_name,
				email: user_data.email,
				ip: data.client.ip,
				browser: data.client.browser,
				plan: user_data.plan || 0,
				scope: scopes.name,
				uid_scope: scopes.uid_scope
			});
			data.o.session = session.export();
			data.o.logged = true;
			return data.callback(data.o);
		}else{
			// 3. if the session exist
			// 3.1 we have to compare the new token with the old token
			data.o.logged = false;
			let old_token = session._token;
			if(old_token !== data.i.token && (data.i.token !== null && data.i.token !== undefined))
			{
				Session_manager.delete_session(session._id);
				data.o.message = 'Tokens do not match.';
				return data.callback(data.o);
			}
			// 3.2 we have to compare the expiring date
			let today = tools.date.now();
			let expire = session._expire;
			if(today.getTime() > expire.getTime())
			{
				Session_manager.delete_session(session._id);
				data.o.message = 'The session is expired.';
				return data.callback(data.o);
			}
			// 3.3 we have to change the token
			const new_token = Session_manager.update_token(session._id);
			data.o.session = session.export();
			
			data.o.logged = true;

			return data.callback(data.o);
		}
	},
	try: async (data)=>
	{
		let resp = await data.lib.db_queries.get_username_pass(data, data.i.username, data.i.pass);
		
		if(resp.length == 0)
		{
			data.o.error = true;
			data.o.message = 'User does not exist or is banned.';
			return data.callback(data.o);
		}
		
		// let resp2 = await data.mysql.query(`SELECT token, expire_date FROM users_login WHERE ip = '${data.client.ip}' AND browser = '${data.client.browser}' AND user_uid = '${resp[0].uid}' AND status = '1' LIMIT 1;`);
		const resp2 = await data.lib.db_queries.get_db_user_login(data, data.client.ip, data.client.browser, resp[0].uid);
		const resp3 = await data.lib.db_queries.get_db_user_scope(data, resp[0].uid);
		
		let create_session = true;
		let token = '';
		let now = tools.date.now();
		let expire_date = tools.date.add_days(now, app_conf._expire_date_days);
		if(resp2.length >= 1)
		{
			create_session = false;
			token = resp2[0].token;
			let expire_date = tools.date.date(resp2[0].expire_date);
			if(tools.date.now().getTime() > expire_date)
				create_session = true;
		}
		if(create_session)
		{
			let session_uid = tools.uid();
			token = tools.uid();
			let today_date_time = tools.date.date_time_read(now);
			let expire_date_time = tools.date.date_time_read(expire_date);
			await data.lib.db_queries.set_db_user_login(data, session_uid, resp[0].uid, today_date_time, data.client.ip, expire_date_time, data.client.browser, token);
			// await data.mysql.query(`INSERT INTO users_login (uid, user_uid, date_time, ip, expire_date, browser, token) VALUES ('${session_uid}', '${resp.result[0].uid}', '${today_date_time}', '${data.client.ip}', '${expire_date_time}', '${data.client.browser}', '${token}')`, (resp3)=>{});
		}

		const session = Session_manager.new_session(resp2.uid, {
			id: resp2.uid,
			token: token,
			user_uid: resp[0].uid,
			expire: expire_date,
			user_name: data.i.username,
			first_name: resp[0].first_name,
			last_name: resp[0].last_name,
			email: resp[0].email,
			ip: data.client.ip,
			browser: data.client.browser,
			plan: resp[0].plan,
			scope: resp3[0].name,
			uid_scope: resp3[0].uid
		});
		
		data.o.session = session.export();
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
