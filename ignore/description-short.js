const _ = require('lodash');
const db = require('./db');
const moment = require('moment');
var schedule = require('node-schedule');
var globalFunc = require('./functions');
var fs = require('fs');
var Client = require('ftp');
const id_lang = 2;
const id_tax = 53;
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0 
var porcentajeSupplier = 0;
const categoriasComputo = [1722,1750,2917,2921,2924,2926,2927];

// ciudad juarez = CJS // mexicali = MXL // Tijuana = TIJ // Ensenada = ENS // La paz - PAZ // Tapachula = TAP
const ciudadesNoAdmitidas = ["CJS", "MXL", "TIJ", "ENS", "PAZ", "TAP"]
let jsonCompletoOrigen = []

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler');
const { reject } = require('lodash');
const { resolve } = require('path');
const scheduler = new ToadScheduler()

async function update(sql) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('Se ha actualizado' + result);
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}

function get_Sentense(){
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            let sql = `
            select product.id_product, manufacturer.name, product.reference, product_lang.name as titulo, product_lang.description
                from ps_product as product
                inner join ps_product_lang as product_lang on product.id_product = product_lang.id_product
	            inner join ps_manufacturer as manufacturer on product.id_manufacturer = manufacturer.id_manufacturer
            `;
            conn.query(sql, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products_repetidos'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_products_repetidos');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}


async function init(){
    var sentenciaBruta = await get_Sentense()

    var sql_actualizacion = ''
    var contador = 0

    for(key in sentenciaBruta){
        // console.log(sentenciaBruta[key]);

        var nuevaDescripcion = sentenciaBruta[key].description;
        console.log('saludos dentro');
        
        var description = nuevaDescripcion.replace(/&nbsp;/g, ' ');
        var description2 = description.replace(/^\s+|\s+$|\s+(?=\s)/g, ' ');
        var description3 = description2.replace(/<[^>]*>?/gm, ' ');
        var description4 = description3.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
        var description5 = description4.replace(/\r?\n|\r/g,' ');
        var description6 = description5.replace(/\r?\n|\r/, ' ');
        var description7 = description6.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        // var description3 = description2.replace(/\s+/g, '');
        // var description4 = description3.replace(/['"]+/g, '');
        // var description5 = description4.replace(/["']/g, '');
        // var description6 = description5.replace(/["]/g, '');
        // var description7 = description6.replace(/[']/g, '"');
        // 
        //         
        var descripcionArmada = sentenciaBruta[key].name + ' ' + sentenciaBruta[key].reference + ' ' + sentenciaBruta[key].titulo + ' ' + description7;
        var descripcion = descripcionArmada.substr(0, 800);
        sql_actualizacion += "UPDATE ps_product_lang SET description_short = '"+descripcion+"' WHERE id_product = '"+sentenciaBruta[key].id_product+"'; \n";
        // descripcion = '';

        

        if(contador == 5000)
        {
            // console.log(sql_actualizacion);
            // update(sql_actualizacion);
            // sql_actualizacion = '';
            contador = 0;

            sql_actualizacion += "\n /*Wuicho*/ \n";
        }

        contador++;
    }
    fs.writeFile('description-short.sql', sql_actualizacion, (error) =>{
        if(error)
        {
            reject(error);
        }
        else
        {
            resolve();
        }
    });
    // console.log(sql_actualizacion);
    // update(sql_actualizacion);

    console.log(contador);
    console.log("Actualizacion de descripcion short finalizada. Adios c:");
}

init();