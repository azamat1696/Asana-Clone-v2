const express = require('express');
const fileUpload = require('express-fileupload');
const helmet = require('helmet');
const cors = require('cors');
const config = require('./config');
const loaders = require('./loaders');
const events = require('./scripts/events');
const path = require('path');
const errorHandler = require('./middlewares/errorHandler');
const {ProjectRoutes, UserRoutes,SectionRoutes,TaskRoutes} = require('./api-routes');

config();
loaders();
events();

const app = express();
app.use("/uploads", express.static(path.join(__dirname, './', 'uploads')));
app.use(express.json())
app.use(helmet());
app.use(cors());
app.use(fileUpload());

app.use(ProjectRoutes.path, ProjectRoutes.router);
app.use(UserRoutes.path, UserRoutes.router);
app.use(SectionRoutes.path, SectionRoutes.router);
app.use(TaskRoutes.path, TaskRoutes.router);
app.use((req, res,next) => {
    const error = new Error('Aradığınız sayfa bulunamadı...');
    error.status = 404;
    next(error);
});
app.use(errorHandler);


app.listen(process.env.APP_PORT, () => {
       console.log('Server is running on port 3000');
});

