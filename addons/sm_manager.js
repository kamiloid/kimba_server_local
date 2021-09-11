const {app_conf, db_conf, serve_conf} = require('../core/conf/conf.js');
const {tools} = require('../core/conf/tools.js');

exports.sm_manager =
{
    add_account: async(data, callback = null)=>
    {
        data.o.logged = false;
        let session_resp = await data.lib.tokenizer.check_session_byIpBrowser(data);
        if(session_resp.error)
            return data.callback(data.o);
        let session = session_resp.session;

//         token: '04907f0ceda7251942cd6ddf4170d483',
//   user_uid: 'aef1d82f631b0eb75237cf8e43a51ee2',
//   expire: 2021-10-01T12:49:49.000Z,
//   user_name: 'user_test2',
//   first_name: 'User test 2',
//   last_name: 'User test 2',
//   email: 'user_test2@gmail.com',
//   ip: 'localhost',
//   browser: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36'

        let query = `SELECT uid FROM sm_accounts WHERE sm_username = '${data.i.username}' AND sm_type = '${data.i.type}';`;
        let update = false;
        if(data.i.id.trim() !== '')
        {
            update = true;
            query = `SELECT uid FROM sm_accounts WHERE uid = '${data.i.id}';`;
        }

        let res1 = await data.mysql.query(query);

        let uid = tools.uid();
        if(res1.result.length >= 1 && !update)
        {
            uid = res1.result[0].uid;
            if(callback){
                callback(res1);
                return;
            }
            return data.callback(data.o);
        }
        
        let date_create = tools.date.date_time_read();

        let query2 = `INSERT INTO sm_accounts (uid, user_uid, sm_username, sm_type, date_create) VALUES ('${uid}', '${session.user_uid}', '${data.i.username}', '${data.i.type}', '${date_create}');`;
        if(update)
            query2 = `UPDATE sm_accounts SET sm_username = '${data.i.username}', sm_type = '${data.i.type}' WHERE uid = '${data.i.id}';`;

        let res2 = await data.mysql.query(query2);
        if(callback){
            callback(res1);
            return;
        }
        // update sm_username
        return data.callback(data.o);
    },
    get_accounts: async(data, callback)=>
    {
        data.o.logged = false;
        let session_resp = await data.lib.tokenizer.check_session_byIpBrowser(data);
        if(session_resp.error)
            return data.callback(data.o);
        let session = session_resp.session;

        data.o.accounts = [];
        let res1 = await data.mysql.query(`SELECT uid, sm_username, status, sm_type FROM sm_accounts WHERE user_uid = '${session.user_uid}' AND removed = '0' ORDER BY date_create ASC;`);
        for(let a of res1.result)
        {
            data.o.accounts.push({
                username: a.sm_username,
                type: a.sm_type,
                id: a.uid,
                status: a.status
            });
        }
        return data.callback(data.o);
    },
    remove_account:async function(data, callback)
    {
        data.o.logged = false;
        let session_resp = await data.lib.tokenizer.check_session_byIpBrowser(data);
        if(session_resp.error)
            return data.callback(data.o);
        let session = session_resp.session;

        let resp1 = await data.mysql.query(`UPDATE sm_accounts SET removed = '1', status = '0' WHERE uid = '${data.i.id}' AND user_uid = '${session.user_uid}';`);
        return data.callback(data.o);
    },
    toggle_account: async function(data, callback)
    {
        data.o.logged = false;
        let session_resp = await data.lib.tokenizer.check_session_byIpBrowser(data);
        if(session_resp.error)
            return data.callback(data.o);
        let session = session_resp.session;

        let resp0 = await data.mysql.query(`SELECT status FROM sm_accounts WHERE uid = '${data.i.id}' AND user_uid = '${session.user_uid}';`);
        if(resp0.result.length === 0)
        {
            data.o.message = 'Account does not exist.';
            data.o.error = true;
            return data.callback(data.o);
        }
        let status = parseInt(resp0.result[0].status) === 1 ? 0 : 1;
        let resp1 = await data.mysql.query(`UPDATE sm_accounts SET status = '${status}' WHERE uid = '${data.i.id}' AND user_uid = '${session.user_uid}';`);
        return data.callback(data.o);
    }
}