const {app_conf, db_conf, serve_conf} = require('../conf/conf.js');
const {tools} = require('../conf/tools.js');

exports.db_queries =
{
    get_db_session_by_ip_browser: async (data, callback = null)=>
	{
		let resp = await data.mysql.query(`SELECT id, uid, token, expire_date, user_uid FROM users_login WHERE ip = '${data.client.ip}' AND browser = '${data.client.browser}' AND status = '1';`, callback);
		return resp;
	},
	get_db_user_data: async (data, user_uid, callback = null)=>
	{
		let resp = await data.mysql.query(`SELECT user_name, first_name, last_name, email, plan FROM users WHERE uid = '${user_uid}' AND status = '1';`, callback);
		return resp
	}
}