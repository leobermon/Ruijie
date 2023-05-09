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

function get_products_repetidos_with_order() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query("select `id_product`,`id_supplier`,`reference`, od.id_order from ps_product INNER JOIN ps_order_detail od ON od.product_id=ps_product.id_product where `reference` in (select `reference` from ps_product where id_supplier = 4 group by `reference` having count(*) > 1)", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products_repetidos_with_order'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_products_repetidos_with_order');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function get_products_repetidos() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query("select `id_product`,`id_supplier`,`reference`,`date_add`,`date_upd` from ps_product where `reference` in (select `reference` from ps_product where id_supplier = 4 group by `reference` having count(*) > 1)", function (err, result) {
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


function delete_producto_repetido(id_product) {
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
function insert_producto_repetido(id_product,reference) {
    contador_productos_eliminados++;
    
    return new Promise(resolve => { 
        db.getConnection((err, conn) => {
            conn.query('Insert into ps_product_repetido (id_product,reference) VALUES ('+id_product+','+reference+')',
                function (error, result) {
                    if (error) {
                        resolve('fail');
                    } else {
                        resolve('done');
                    }
                    conn.release();
                });
        })
    })
    
}
async function prueba(){
    let contador_productos_repetidos = 0;
    let contador_productos_repetidos_con_orden = 0;
    let contador_productos_repetidos_sin_orden = 0;
    let contador_productos_repetidos_con_orden_para_borrar = 0;
    let contador_productos_repetidos_sin_orden_para_borrar = 0;

    const lista_productos_repetidos_con_orden = await get_products_repetidos_with_order();

    //verificando si existen productos repetidos
    if(lista_productos_repetidos_con_orden.length-1>0){
        
        //creando arreglo y llenando con los productos repetidos con orden
        for (key in lista_productos_repetidos_con_orden) {
            arreglo_productos_repetidos_con_orden[lista_productos_repetidos_con_orden[key].id_product] = lista_productos_repetidos_con_orden[key];
            
        }
    
    }
    //lista de productos repetidos
    const lista_productos_repetidos = await get_products_repetidos();
    //verificamos que existan productos repetidos
    if(lista_productos_repetidos.length-1>0){
        
        //creando arreglo y llenando con los productos repetidos
        for (key in lista_productos_repetidos) {
            
            if(arreglo_productos_repetidos_con_orden[lista_productos_repetidos[key].id_product]){
                //productos que no se deben de borrar
                contador_productos_repetidos_con_orden++;
            }else{
                //productos que se deben de borrar
                contador_productos_repetidos_sin_orden++;
                // insert_producto_repetido(lista_productos_repetidos[key].id_product,lista_productos_repetidos[key].reference);
                delete_producto_repetido(lista_productos_repetidos[key].id_product);
            }
        }
    
    }

    console.log(lista_productos_repetidos);
    console.log('Cantidad de productos repetidos con orden '+lista_productos_repetidos_con_orden.length);
    console.log('Cantidad de productos repetidos '+lista_productos_repetidos.length);
    console.log('cantidad de productos que no se deben de borrar '+contador_productos_repetidos_con_orden);
    console.log('cantidad de productos que se deben de borrar '+contador_productos_repetidos_sin_orden);
    console.log('Cantidad de productos eliminados '+contador_productos_eliminados);
}
prueba();

