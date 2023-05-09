const axios = require('axios').default;
const _ = require('lodash')
const db = require('../db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('../functions')
const id_lang = 2
const id_tax = 53
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
let myArray ={};
let myArray_repetido_orden ={};
let myArray_repetido ={};
let Array_productos_borrados = {};

let arreglo_productos_repetidos = {};
let arreglo_productos_repetidos_con_orden = {};
let arreglo_productos_repetidos_sin_orden = {};
let arreglo_productos_repetidos_con_orden_para_borrar = {};
let arreglo_productos_repetidos_sin_orden_para_borrar = {};
let contador_productos_eliminados = 0;
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



function get_products() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`SELECT id_product, reference,supplier_reference, mpn FROM ps_product where id_product = 34951
            or id_product = 50885
            or id_product = 32362
            or id_product = 28474
            or id_product = 53294
            or id_product = 48834
            or id_product = 28574
            or id_product = 40958
            or id_product = 28396
            `, function (err, result) {
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


function delete_producto_by_id(id_product) {
    contador_productos_eliminados++;
    // DELETE FROM ps_product where id_product = '`+ id_product +`';
    
    return new Promise(resolve => { 
        db.getConnection((err, conn) => {
            conn.query(`
            SET SQL_SAFE_UPDATES = 0;
            DELETE FROM ps_product_lang where id_product = '`+ id_product +`';
            DELETE FROM ps_product_shop where id_product = '`+ id_product +`';
            DELETE FROM ps_product_supplier where id_product = '`+ id_product +`';
            DELETE FROM ps_stock_available where id_product = '`+ id_product +`';
            DELETE FROM ps_producto_detalles where product_id = '`+ id_product +`';
            DELETE FROM ps_producto_files where id_product = '`+ id_product +`';
            DELETE FROM ps_productos_syscom where id_product = '`+ id_product +`';
            DELETE FROM ps_product where id_product = '`+ id_product +`';
            `,
                function (error, result) {
                    if (error) {
                        console.log(error);
                        resolve('fail');
                    } else {
                        console.log('done');
                        resolve('done');
                    }
                    conn.release();
                });
        })
    })
    
}

async function prueba(){
    let contador_productos_repetidos_con_orden = 0;
    let contador_productos_repetidos_sin_orden = 0;

    //lista de productos repetidos
    const lista_productos_sin_referencia = await get_products();
    console.log(lista_productos_sin_referencia.length);

    
    //verificamos que existan productos repetidos
    if(lista_productos_sin_referencia.length>0){
        //creando arreglo y llenando con los productos repetidos
        
        for (key in lista_productos_sin_referencia) {
        console.log(lista_productos_sin_referencia[key]['id_product'])

        delete_producto_by_id(lista_productos_sin_referencia[key]['id_product']);
            
        }
        
    }
    
}
prueba();

