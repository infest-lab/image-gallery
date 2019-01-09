'use strict';
const swaggerParser = require('swagger-parser');
const swaggerTools = require('swagger-tools');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const compression = require('compression');
const db = require('./core/db');
const auth = require('./core/auth');
const library = require('./core/library');
const config = require('./core/config');
const authMiddleware = require('./lib/auth-middleware');
const serveStatic = require('serve-static');
const path = require('path');
const firstExists = require('./lib/first-exists');

const app = express();
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(session({
  secret: 'keyboard cat',
  saveUninitialized: true,
  resave: true,
  cookie: { secure: false }
}));

db.initialize()
  .then(() => config.initialize())
  .then(() => auth.initialize(app))
  .then(() => library.initialize(app))
  .then(() => firstExists(__dirname, '/spec/gallery-api.yaml', '../spec/gallery-api.yaml'))
  .then(specFile => swaggerParser.bundle(specFile))
  .then(spec => {
    swaggerTools.initializeMiddleware(spec, function (middleware) {
      app.use(middleware.swaggerMetadata());
      app.use(middleware.swaggerSecurity({
        oauth2: function (req, def, scopes, callback) { }
      }));
      app.use(middleware.swaggerValidator({
        validateResponse: true
      }));
      app.use(authMiddleware());
      app.use(middleware.swaggerRouter({ useStubs: false, controllers: path.resolve(__dirname, 'controllers') }));
      app.use(middleware.swaggerUi());

      app.use('/static', serveStatic(path.join(__dirname, 'public')));
      app.get('*', function(req, res) {
        res.sendFile( path.join(__dirname, 'public/index.html'));
      });

      app.listen(3000);
      console.log('Server started on port 3000');
    });
  });
