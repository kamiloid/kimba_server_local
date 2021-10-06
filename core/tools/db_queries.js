const {app_conf, db_conf, serve_conf} = require('../conf/conf.js');
const {tools} = require('../conf/tools.js');

exports.db_queries =
{
    get_db_session_by_ip_browser: async (data, callback = null)=>
	{
		const query = `SELECT id, uid, token, expire_date, user_uid FROM users_login WHERE ip = '${data.client.ip}' AND browser = '${data.client.browser}' AND status = '1' ORDER BY date_time DESC LIMIT 1;`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	},
	get_db_user_data: async (data, user_uid, callback = null)=>
	{
		const query = `SELECT user_name, first_name, last_name, email, plan FROM users WHERE uid = '${user_uid}' AND status = '1';`;
		let resp = await data.mysql.query(query, callback);
		return resp
	},
	get_db_user_scope: async (data, user_uid, callback = null) =>
	{
		// const query = `SELECT uid_scope, name FROM users_scope WHERE uid_user = '${user_uid}';`;
		const query = `SELECT us.uid_scope, s.name FROM users_scope as us INNER JOIN scopes as s  WHERE us.uid_user = '${user_uid}' AND s.uid = us.uid_scope;`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	},
	get_username_pass: async (data, user_name, pass, callback = null) =>
	{
		const query = `SELECT uid, status, id, first_name, last_name, email, plan FROM users WHERE user_name = '${user_name}' AND pass = '${pass}' LIMIT 1;`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	},
	get_db_user_login: async (data, ip, browser, user_uid, callback = null) =>
	{
		const query = `SELECT uid, token, expire_date FROM users_login WHERE ip = '${ip}' AND browser = '${browser}' AND user_uid = '${user_uid}' AND status = '1' LIMIT 1;`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	},
	set_db_user_login: async (data, session_uid, user_uid, date_time, ip, expire_date_time, browser, token, callback = null) =>
	{
		const query = `INSERT INTO users_login (uid, user_uid, date_time, ip, expire_date, browser, token) VALUES ('${session_uid}', '${user_uid}', '${date_time}', '${ip}', '${expire_date_time}', '${browser}', '${token}')`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	},
	logout: async (data, session_uid, out_date, callback = null) =>
	{
		const query = `UPDATE users_login SET status = '0', out_date = '${out_date}' WHERE uid = '${session_uid}';`;
		let resp = await data.mysql.query(query, callback);
		if(resp.result)
			return resp.result;
		return [];
	}
}