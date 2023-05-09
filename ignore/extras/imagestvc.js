const axios = require('axios').default;
const _ = require('lodash')
const moment = require('moment')
var globalFunc = require('./functions')


const { ToadScheduler, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()

async function asyncCall() {
    await globalFunc.saveImagesToPath('https://4820964.app.netsuite.com/core/media/media.nl?id=7482878&c=4820964&h=BBuBSix1EHSEsfOh9-LAIiq526NfKvX46g3EQMmSW3EkT-4D', 35584, 'tecno');
    // await globalFunc.saveImagesToPath('https://tvc.mx/media/98181/ubam.png', 51900, 'tecno');
    // await globalFunc.saveImagesToPath('https://tvc.mx/media/88292/gallery-1.png', 51901, 'tecno');

    

    console.log('Actualizacion terminada ###########################');
    console.log('Hora Termino: ' + moment().format('DD-MM-YYYY HH:mm:ss'));


}

asyncCall()