//var bodyParser = require('body-parser');
const {app_conf, db_conf, serve_conf} = require('./core/conf/conf.js');
const {tools} = require('./core/conf/tools.js');
const {mysql} = require('./core/conf/mysql.js');
const express = require('express');
const exp_session = require('express-session');
const {collections} = require('./core/collections.js');
const app = express();


app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.listen(serve_conf._port, () => {
  tools.log(`Serve app listening at ${serve_conf._port}`);
});

mysql.setup(db_conf._mysql1.host, db_conf._mysql1.db, db_conf._mysql1.user, db_conf._mysql1.pass);
mysql.connect(()=>
	{
		tools.log('MySql connected!!');
	}, (err)=>
	{
		tools.log('MySql error!!');
	});

tools.cross_domaine(app, app_conf._prefix);






// //////////////////////////////////////////////////////////////////////////////////////////////////
// LOCAL ONLY
// //////////////////////////////////////////////////////////////////////////////////////////////////
app.use(`/${app_conf._prefix}/api`, function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  next();
 });
 // //////////////////////////////////////////////////////////////////////////////////////////////////
 // //////////////////////////////////////////////////////////////////////////////////////////////////













app.post(`/${app_conf._prefix}/api`, async function(req, res)
	{
		if(!mysql.connected()) return;
		let input = req.body;
		if(input.a == null || input.a == undefined) return;
		if(input.cmd == null || input.cmd == undefined) return;
		if(input.args === null || input.args === undefined) return;

		let lib = await tools.fs.load_tools();

        if(input.args.token !== null)
        {
			let current_session_resp = lib.tokenizer.check_current_token_validation(input.args.token);
			if(!current_session_resp.logged && current_session_resp.error)
				return res.send(current_session_resp);
			else if(current_session_resp.fake){
				// log this incident as fake user
			}
        }


		const addon = {};
		addon[input.a] = require('./addons/'+input.a+'.js');
		let mod = addon[input.a][input.a];
		if(mod[input.cmd] == null || mod[input.cmd] == undefined) return;
		const args = {
			i: input.args,
			o: {error: false, message: 'no errors', session: {}},
			client: {
				ip: req.headers['x-forwarded-for'] || 'localhost',
				browser: req.headers['user-agent']
			},
			mysql: mysql ? mysql.public() : {},
			tools: tools,
			collections: collections,
			callback: (output)=> { res.send(output); },
            res: res,
            req: req,
			lib: lib
		};
        console.log(input.a, input.cmd);
		let caller = mod[input.cmd](args);
		if(!caller) return;
		if(caller.then !== undefined) return;
		mod[input.cmd](args).then(output=>
			{
				res.send(output);
			});
	});
