var combo    = require('combohandler'),
    express  = require('express'),
    expmap   = require('express-map'),
    expstate = require('express-state'),
    exphbs   = require('express3-handlebars'),
    path     = require('path'),

    config     = require('./config'),
    hbs        = require('./lib/hbs'),
    middleware = require('./lib/middleware'),
    routes     = require('./lib/routes'),

    app = express(),
    pathTo;

// -- Configure App ------------------------------------------------------------

expmap.extend(app);
expstate.extend(app);

app.set('name', 'Pure');
app.set('env', config.env);
app.set('port', config.port);
app.enable('strict routing');

app.engine(hbs.extname, hbs.engine);
app.set('view engine', hbs.extname);
app.set('views', config.dirs.views);

app.locals({
    site          : 'Pure',
    copyright_year: '2013',

    version     : config.version,
    pure_version: config.pure.version,
    yui_version : config.yui.version,

    isDevelopment: config.isDevelopment,
    isProduction : config.isProduction,
    isPureLocal  : !!config.pure.local,

    min: config.isProduction ? '-min' : '',

    modules  : config.pure.modules,
    filesizes: config.pure.filesizes,

    ga     : config.isProduction && config.ga,
    typekit: config.typekit
});

app.expose(config.yui.config, 'YUI_config');

// -- Middleware ---------------------------------------------------------------

if (config.isDevelopment) {
    app.use(express.logger('tiny'));
}

app.use(express.compress());
app.use(express.favicon(path.join(config.dirs.pub, 'favicon.ico')));
app.use(app.router);
app.use(middleware.slash);

if (config.pure.local) {
    console.log('Serving Pure from:', config.pure.local);
    app.use('/css/pure/', express.static(config.pure.local));
}

app.use(express.static(config.dirs.pub));
app.use(middleware.notfound);

if (config.isDevelopment) {
    app.use(express.errorHandler({
        dumpExceptions: true,
        showStack     : true
    }));
} else {
    app.use(middleware.error);
}

// -- Routes -------------------------------------------------------------------

// Sugar to route pages and add them to the nav menu.
function routePage(name, path, label, callbacks) {
    if (typeof label !== 'string') {
        callbacks = label;
        label     = null;
    }

    app.get(path, callbacks);
    app.map(path, name);

    if (label) {
        app.annotate(path, {label: label});
    }
}

// Basic docs pages.
routePage('home',      '/',                        routes.render('home'));
routePage('base',      '/base/',      'Base',      routes.render('base'));
routePage('grids',     '/grids/',     'Grids',     routes.render('grids'));
routePage('forms',     '/forms/',     'Forms',     routes.render('forms'));
routePage('buttons',   '/buttons/',   'Buttons',   routes.render('buttons'));
routePage('tables',    '/tables/',    'Tables',    routes.render('tables'));
routePage('menus',     '/menus/',     'Menus',     routes.render('menus'));
routePage('customize', '/customize/', 'Customize', routes.render('customize'));
routePage('extend',    '/extend/',    'Extend',    routes.render('extend'));
routePage('layouts',   '/layouts/',   'Layouts',   routes.render('layouts'));

// Layout examples.
app.get('/layouts/:layout/', routes.layout('layouts/'));
app.map('/layouts/:layout/', 'layout');

// Static asset combo.
app.get('/combo/:version', [
    combo.combine({rootPath: config.dirs.pub}),
    combo.respond
]);

// Redirects
app.get('/updates/', routes.redirect('http://blog.purecss.io/', 301));

// Create Handlebars `pathTo` helper using the routes map.
pathTo = expmap.pathTo(app.getRouteMap());
hbs.helpers.pathTo = function (name, options) {
    return pathTo(name, options.hash);
};

// Create `nav` local with all labeled routes.
app.locals.nav = app.findAll('label').map(function (route) {
    return {
        path   : route.path,
        name   : route.annotations.name,
        label  : route.annotations.label,
        divider: route.annotations.name === 'customize'
    };
});

// -- Exports ------------------------------------------------------------------
module.exports = app;
