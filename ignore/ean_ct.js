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

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
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

function get_productos() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            let sql = `select p.id_product,p.ean13, pd.ean from ps_product p
            left join ps_producto_detalles pd on pd.product_id = p.id_product
            where (pd.ean != '')
            and p.id_supplier = 3
            `;
            // obtenemos todos los productos de syscom de la bd novusred
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

    var productos = await get_productos()

    // console.log(productos[0]);
    let sql_update = '';
    let contador_for = 0;
   
    for (key in productos) {
        console.log(productos[key]);
        sql_update += 'UPDATE ps_product SET ean13 = "'+productos[key]['ean']+'" WHERE (id_product = "'+productos[key]['id_product']+'"); ';

        if(contador_for>= 500){
            console.log(sql_update);
            update(sql_update);
            sql_update = '';
            contador_for = 0;
        }

        contador_for++;

    }
    console.log(sql_update);
    update(sql_update);

    console.log(contador_for);

}
init();