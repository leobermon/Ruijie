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
let products = {};


function get_products() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query("SELECT p.id_product, p.reference ,pd.nombre, pd.model,pd.marca FROM ps_product p inner join ps_producto_detalles pd on pd.product_id = p.id_product", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_products');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}


//función para actualizar la url amigable y meta de los productos.
function update_link_rewrite_meta(sql){
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
async function prueba(){
    let count_products = 0;
    var listaToUpdate = ''
    var countProductsUpdate = 1
    const lista_productos = await get_products();

    //verificando si existen productos repetidos
    if(lista_productos.length>0){
        
        //creando arreglo y llenando con los productos repetidos con orden
        for (key in lista_productos) {
            // console.log(lista_productos[key].nombre)
            var cleanNameString = globalFunc.cleanName(lista_productos[key].nombre)
            var nameNoSpecial4 = cleanNameString.replace(/  /g, ' ')
            var nameNoSpecial6 = nameNoSpecial4.split(' ').join('-')
            var metaName = lista_productos[key].model + ' '+lista_productos[key].marca + ' '+nameNoSpecial4
            var metaDescription = 'Novusred: '+ lista_productos[key].model + ' '+lista_productos[key].marca + ' '+nameNoSpecial4
            var name = nameNoSpecial6.substr(0,80);
            var modelo_sin_espacios = lista_productos[key].model.split(' ').join('-')
            var marca_sin_espacios = lista_productos[key].marca.split(' ').join('-')
            var linkRewrite =  modelo_sin_espacios+ '-'+marca_sin_espacios + '-'+name+'-' +lista_productos[key].reference;
            var linkRewrite_sin_acentos = linkRewrite.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            // console.log(linkRewrite_sin_acentos)
            // console.log(metaName)
            var metaNameFormat = metaName.substr(0,60);
            var metaDescriptionFormat = metaDescription.substr(0,155);
            
            // console.log(metaNameFormat)
            
            listaToUpdate += `UPDATE ps_product_lang SET link_rewrite = '${linkRewrite_sin_acentos}', meta_title = '${metaNameFormat}' , meta_description = '${metaDescriptionFormat}' WHERE id_product = '${lista_productos[key].id_product}' and id_shop = '1' and id_lang = '2';`

            if (countProductsUpdate == 500) {
                console.log(listaToUpdate)

                console.log('QUERY UPDATE')
                // console.log(listaToUpdate)
            
                console.log('contador de 500');
                console.log('update responde');
                
                await update_link_rewrite_meta(listaToUpdate)

                listaToUpdate = ''
                countProductsUpdate = 0
            }
            
            countProductsUpdate++
        }
        await update_link_rewrite_meta(listaToUpdate)
    }
    
    // console.log(lista_productos.length);
    // console.log(lista_productos);
    console.log("finalizado");
}
prueba();

