var mysql = require('mysql');
const {tools} = require('./tools.js');

exports.mysql =
{
	_is_connected: false,
	_time_conn: 0,
	_conn: null,
	_db: null,
	_host: '',
	_dbstr: '',
	_user: '',
	_pass: '',
	connected:function(){return this._is_connected;},
	setup:function(host, db, user, pass)
	{
		this._host = host;
		this._dbstr = db;
		this._user = user;
		this._pass = pass;
	},
	public: function(){
		return {_conn: this._conn, select: this.select, insert: this.insert, update: this.update, delete: this.delete, query: this.query}
	},
	connect: function(cback = null, error_cback = null)
	{
		if(this._is_connected)
		{
			tools.log('MYSQL is already connected');
			return;
		}
		let init_time = (new Date()).getTime();
		this._conn = mysql.createConnection(
			{
				host: this._host,
				user: this._user,
				password: this._pass,
				database: this._dbstr
			});
			// .then((res, err)=>
			// 	{
			// 		this._time_conn = (new Date()).getTime() - init_time;
			// 		tools.log(this._time_conn / 1000);

			// 		if(err){
			// 			if(error_cback){
			// 				error_cback(err);
			// 				return;
			// 			}
			// 		}
			// 		this._is_connected = true;
			// 		if(cback)
			// 			return cback();
			// 	});
			
		return this._conn.connect((err)=>
			{
				this._time_conn = (new Date()).getTime() - init_time;
				tools.log(this._time_conn / 1000);
				if(err){
					if(error_cback){
						error_cback(err);
						return;
					}
				}
				this._is_connected = true;
				if(cback)
					return cback();
			});
	},
	query: async function(q, callback = null)
	{
		function exec_query(c, q, cb = null)
		{
			let prom = new Promise(resolve =>
				{
					c._conn.query(q, (err, result, fields)=>
					{
						if(callback)
							callback({err, result});
						resolve({err, result});
					});
				});
				
			return prom;
		} 
		let resp = await exec_query(this, q, callback);
		return resp;
	},
	query_error: function(message, callback = null)
	{
		let msg = 'MySQL: Invalid query typed!!!';
		message = message || msg;
		message = message.trim() == '' ? msg : message;
		let resp = {code_error: true, message: message};
		if(callback)
			return callback(resp);
		return resp;
	}
}
