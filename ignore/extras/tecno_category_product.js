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
let jsonCompletoOrigen = [];
var fs = require('fs');
var Client = require('ftp');
function insert_syscom_category_product(id_product_novusred,id_tecno_category,tecno_reference) {
    console.log(id_product_novusred,id_tecno_category,tecno_reference)
    return new Promise(resolve => {
        var sql = `INSERT INTO ps_tecno_category_products (id_product_novusred, id_tecno_category, tecno_reference) VALUES (`+id_product_novusred+`, `+id_tecno_category+`, "`+tecno_reference+`")
        `
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('Se ha insertado' + result);
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}

function get_categias_tecno(categoria, subcategory) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`SELECT * FROM ps_categoriaTecno where category = "`+categoria+`" AND subcategory = "`+subcategory+`";`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_categias_tecno'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_categias_tecno');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function get_product_by_supplier_reference(supplier_reference) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`select id_product, reference, supplier_reference from ps_product where supplier_reference = "`+supplier_reference+`" and id_supplier = 2`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_product_by_supplier_reference'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_product_by_supplier_reference');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function getJsonFile() {
    return new Promise(resolve => {
        axios.get('https://tecnosinergia.com/jsonproductosv2/17cf949d02f1209c638b83ec5f0a84f3')
            //axios.get('http://localhost:3000/hola')
            .then((response) => {
                if (response.data) {

                    jsonCompletoOrigen = response.data

    

                    resolve({ mensaje: 'ok'})
                } else {
                    resolve({ mensaje: 'no hay datos en el axios', data: {} })
                }
            })
            .catch(function (error) {
                resolve({ mensaje: 'error axios', data: {} })
            });
    });
}

async function init(){

    var validator = await getJsonFile()
    if (validator.mensaje == 'ok') {
        // console.log(jsonCompletoOrigen[0]);
        // let product = await get_product_by_supplier_reference(jsonCompletoOrigen[0]['code']);
        // let category = await get_categias_tecno(jsonCompletoOrigen[0]['category'], jsonCompletoOrigen[0]['parent_subcategory']);
        // console.log(product);
        // console.log(category);
        
        for (key in jsonCompletoOrigen) {
            let product = await get_product_by_supplier_reference(jsonCompletoOrigen[key]['code']);
            let category = await get_categias_tecno(jsonCompletoOrigen[key]['category'], jsonCompletoOrigen[key]['parent_subcategory']);
            if(product[0]){
                if(product[0]['id_product'] != undefined && product[0]['supplier_reference'] != undefined){
                    // console.log(product[0]);
                    if(category[0]){
                        console.log(product[0]['id_product']);
                        // console.log(category[0]);
                        // console.log(product[0]['id_product'],category[0]['idCategoria'],category[0]['idSubcategoria'],product[0]['supplier_reference'])
                        insert_syscom_category_product(product[0]['id_product'],category[0]['id'],product[0]['supplier_reference']);
                    }
                
                }
            }
            
            
        }
        
        
    }
    
}
init();

