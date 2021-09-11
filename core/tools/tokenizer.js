const {app_conf, db_conf, serve_conf} = require('../conf/conf.js');
const {tools} = require('../conf/tools.js');

exports.tokenizer =
{
    check_session_byIpBrowser: (data, callback = null)=>
    {
        let session = serve_conf.check_session_by_ip_browser(data.client.ip, data.client.browser);
        let old_token = session.token;
        let resp = old_token !== data.i.token && (data.i.token !== null && data.i.token !== undefined);
        if(resp)
        {
            serve_conf.remove_session(old_token);
            serve_conf.remove_session(data.i.token);
            data.o.message = 'Tokens do not match.';

            if(callback)
                return callback({error: true});
            return {error: true};
        }
        return {error: false, session: session};
    },
    check_current_token_validation: (token, callback = null)=>
    {
        let resp = {logged: true, error: false, message: 'Valid user', fake: false};
        let current_session = serve_conf.check_session_by_ip_browser(token);
        if(current_session)
        {
            let today = tools.date.now();
            let expire = current_session.expire;
            if(current_session.token !== token)
                resp = {logged: false, error: true, message:'Invalid security token.', fake: true};
            else if(today.getTime() > expire.getTime())
                resp = {logged: false, error: true, message:'Session expired.', fake: false};
        }
        if(callback) return callback(resp);
        return resp;
    },
    change_token: async (data, token, callback = null)=>
	{
		let new_token = serve_conf.update_session_token(token);
		let resp = await data.mysql.query(`UPDATE users_login SET token = '${new_token}' WHERE token = '${token}'`, 
		(resp)=>
		{
			if(callback)
				return callback(new_token);
		});
		return resp;
	}
}