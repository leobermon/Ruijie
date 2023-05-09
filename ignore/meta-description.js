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

function update(sql) {
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

function getSentense(){
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
    var sentenciaBruta = await getSentense()

    let sql_actualizacion = '';
    let contador = 0;

    for(key in sentenciaBruta){
        // console.log(sentenciaBruta[key]);

        var nuevaDescripcion = sentenciaBruta[key]['description'];
        console.log('saludos dentro');
        
        var description = nuevaDescripcion.replace(/<[^>]*>?/gm, '');
        var description2 = description.replace(/&nbsp;/g, ' ');
        var description3 = description2.replace(/\s+/g, '');
        var description4 = description3.replace(/['"]+/g, '');
        var description5 = description4.replace(/["']/g, '');
        var description6 = description5.replace(/["]/g, '');
        var description7 = description6.replace(/[']/g, '"');
        var description8 = description7.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        var descripcionArmada = sentenciaBruta[key]['reference'] + ' ' + sentenciaBruta[key]['name'] + ' Adquiere: ' + sentenciaBruta[key]['titulo'] + ' ☑ Compras 100% seguras ☑ Envíos a todo México ' + description8;
        var descripcion = descripcionArmada.substr(0, 150);
        sql_actualizacion += "UPDATE ps_product_lang SET meta_description = '"+descripcion+"' WHERE id_product = '"+sentenciaBruta[key]['id_product']+"'; \n";

        if(contador == 5000)
        {
            contador = 0;
            sql_actualizacion += "\n /*Wuicho*/ \n";
        }

        contador++;
    }

    fs.writeFile('meta-descripcion.sql', sql_actualizacion, (error) =>{
        if(error)
        {
            reject(error);
        }
        else
        {
            resolve();
        }
    });

    console.log(contador);
    console.log("Actualizacion de meta descripcion finalizada. Adios c:");
}

init();