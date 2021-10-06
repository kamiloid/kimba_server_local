class session{
    _id = '';
    _uid = '';
    _token = '';
    _user_name = '';
    _first_name = '';
    _last_name = '';
    _email = '';
    _uid_scope = '';
    _scope = '';
    _ip = '';
    _browser = '';
    _plan = '';
    _expire = null;
    constructor(data)
    {
        this._id = data.id;
        this._uid = data.uid;
        this._token = data.token;
        this._user_name = data.user_name;
        this._first_name = data.first_name;
        this._last_name = data.last_name;
        this._email = data.email;
        this._uid_scope = data.uid_scope;
        this._scope = data.scope;
        this._ip = data.ip;
        this._browser = data.browser;
        this._plan = data.plan;
        this._expire = data.expire;
    };
    export = function()
    {
        return {
            token: this._token,
            user_name: this._user_name,
            first_name: this._first_name,
            last_name: this._last_name,
            email: this._email,
            plan: this._plan || 0,
            scope: this._scope
        }
    }
}

session.create = (data)=>
{
    return new session(data);
}


// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------


const session_manager =
{
    _buffer: {},
    new_session: function(id, data)
    {
        this._buffer[id] = session.create(data);
        return this._buffer[id];
    },
    add_session: function(id, session)
    {
        this._buffer[id] = session;
    },
    get_id: function(id)
    {
        return this._buffer[id];
    },
    get_token: function(token)
    {
        for(let s in this._buffer)
            if(this._buffer[s]._token === token)
                return this._buffer[s];
        return null;
    },
    get_ip_browser: function(ip, browser)
    {
        for(let s in this._buffer)
            if(this._buffer[s]._ip === ip && this._buffer[s]._browser === browser)
                return this._buffer[s];
        return null;
    },
    delete_session: function(id)
    {
        delete this._buffer[id];
    },
    update_token: function(id)
    {
        const {tools} = require('./tools.js');
        const new_token = tools.uid();
        this.change_token(id, new_token);
        return new_token;
    },
    change_token: function(id, new_token)
    {
        const session = this.get_token(id);
        if(session)
            session._token = new_token;
    }
}


// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------

exports.Session = session;
exports.Session_manager = session_manager;