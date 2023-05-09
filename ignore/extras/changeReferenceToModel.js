const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('./functions')

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
let products = {};

function get_products() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos
            query = `
            select p.id_product,p.reference,p.supplier_reference, p.mpn, fpl.value as "model" from ps_product p
            inner join ps_feature_product fp on fp.id_product = p.id_product
            inner join ps_feature_value_lang fpl on fpl.id_feature_value = fp.id_feature_value
            where fp.id_feature = 1
            
            ;`;
            conn.query(query, function (err, result) {
                if (err) {
                    resolve({ok:false, mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products'); 
                        resolve(
                                {
                                    ok:true, 
                                    mensaje: 'Se han encontrado productos', 
                                    data: result 
                                }
                            );

                    } else {
                        console.log('no hay datos - obtener get_products');
                        resolve({ok:false, mensaje: 'error, no data DB', data: {} });
                    }
                }
                conn.release();
            });
        })
    });
}

//función para actualizar la información del producto
function update_product(sql){
    console.log("ingreso a actualziar")
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}



async function init(){
    valid = false;
    
    let resp_products = await get_products();
    let listaToUpdate = '';
    let countProductsUpdate = 1;

    console.log(resp_products);

    
        if(resp_products['ok'] && resp_products['data']){
            for (key in resp_products['data']) {
                let product_id_supplier = '';
                let product_supplier_reference = resp_products['data'][key]['supplier_reference'];
                let product_mpn = '';
                let product_reference = '';

                product_reference = resp_products['data'][key]['model'];
                product_mpn = resp_products['data'][key]['model'];

                product_id_supplier = resp_products['data'][key]['reference'];
                if(resp_products['data'][key]['model'] === '' || resp_products['data'][key]['model'] === null || resp_products['data'][key]['model'] === 'null'){
                    product_reference = resp_products['data'][key]['reference'];
                    product_mpn = resp_products['data'][key]['reference'];
                }

                listaToUpdate += `UPDATE ps_product SET reference = '${product_reference}', supplier_reference = '${product_id_supplier}', mpn = '${product_mpn}' WHERE id_product = '${resp_products['data'][key]['id_product']}';`
                
                if (countProductsUpdate == 500) {
                    console.log(listaToUpdate)

                    console.log('QUERY UPDATE')
                    // console.log(listaToUpdate)
                
                    console.log('contador de 500');
                    console.log('update responde');
                    
                    await update_product(listaToUpdate)

                    listaToUpdate = ''
                    countProductsUpdate = 0
                }
                
                countProductsUpdate++
                
            }
            
        }
        console.log(listaToUpdate);
        await update_product(listaToUpdate);
    
    console.log("finalizado");

}
async function regresar(){
    valid = false;
    
    let resp_products = await get_products();
    let listaToUpdate = '';
    let countProductsUpdate = 1;

    console.log(resp_products);

    
        if(resp_products['ok'] && resp_products['data']){
            for (key in resp_products['data']) {
                let product_id_supplier = '';
                let product_supplier_reference = resp_products['data'][key]['supplier_reference'];
                let product_mpn = resp_products['data'][key]['model'];
                let product_reference = resp_products['data'][key]['model'];
                if(product_supplier_reference == '' || product_supplier_reference == null){
                    product_id_supplier = resp_products['data'][key]['reference'];
                    product_supplier_reference == product_id_supplier;
                }

                listaToUpdate += `UPDATE ps_product SET reference = '${product_supplier_reference}', supplier_reference = '${product_id_supplier}', mpn = '${product_mpn}' WHERE id_product = '${resp_products['data'][key]['id_product']}';`
                
                if (countProductsUpdate == 500) {
                    console.log(listaToUpdate)

                    console.log('QUERY UPDATE')
                    // console.log(listaToUpdate)
                
                    console.log('contador de 500');
                    console.log('update responde');
                    
                    await update_product(listaToUpdate)

                    listaToUpdate = ''
                    countProductsUpdate = 0
                }
                
                countProductsUpdate++
                
            }
            
        }
        console.log(listaToUpdate);
        await update_product(listaToUpdate);
    
    console.log("finalizado");

}

async function prueba(){
    valid = false;
    
    // let resp_products = await get_products();
    let listaToUpdate = '';
    let countProductsUpdate = 1;

    // console.log(resp_products);

    let product_name = 'Dahua tpcbf1241nd3f4 cámara ip bullet térmica hibrida/ wizsense/ resolución de imagen térmica 256x192/ lente térmico de 7mm/ le';
    let stringLowerCase = product_name.toLocaleLowerCase();
    let stringUpperCase = stringLowerCase
    .split(/ /g).map(word =>
        `${word.substring(0,1).toUpperCase()}${word.substring(1)}`)
    .join(" ");
    
    console.log(stringUpperCase);

    console.log("finalizado");

}
init();


