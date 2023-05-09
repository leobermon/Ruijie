const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('./functions')
const id_lang = 2
const id_tax = 53
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()

function insertCodigoPostal() {
    return new Promise(resolve => {
        var sql = `        
        `
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del insert codigo postal' + result);
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}



insertCodigoPostal()

// prueba()