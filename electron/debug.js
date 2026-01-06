const { app } = require('electron')

console.log(app)

const electronApp = app.getGPUInfo("complete");

console.log(electronApp);
