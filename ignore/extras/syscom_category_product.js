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
axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIn0.eyJhdWQiOiI2NlNOYWFKNzNOVzRxT3RpMEllWDNIVE1oUDVPVzVrRyIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIiwiaWF0IjoxNjMzNTYwMTY2LCJuYmYiOjE2MzM1NjAxNjYsImV4cCI6MTY2NTA5NjE2Niwic3ViIjoiIiwic2NvcGVzIjpbXX0.joiZTq_0Mcf3FLoNojUffGLcWjNA5cXnscN6zKW5rqB482Uy8HegilfHWGO_u2-sylz3RHtMsfnops4iin9QV1UEbbaziFC61UJZ2MZdqRgF_c74W1bmOCLKVa6Agde0V1qK3zhzscQy7_1FtM5qqwHg5z6LLhrX2pIJjiarF7L2oDaxba-SRkLcEdUJ-Gk922j5iqGM48kzDp2QR7PjdcatfpRZ6FpMLLB1fk2r52A5u3QjOaHAoG7WSOHjsNz9nWWyVbWxOI_B29RAG1A8zSDm1PjyM6EQIk-QMm90JvbUEIgDCGhrXer6HqyuNQ2Wh7hVTaiFU02kRrJurK8dBUSuPqEHN4a28bFZdUMd-wfGiZu_VTlYpoK-Wn0NnLjZ7HokWs5GQaLMG9wka-CooqzpyDU_bnraQBtOfqP8fsnWoeLk1o88aTeoCk5YXtBxTedLoAqvnqNXwcySvtAg96E1LKiojGIUGg7nQ4xbOcyguH4C5OJLgnYgJwsPcMoA_sNa2PcsDquVXO1zjpfigK_-84cjbUO5U1KQ3__hKUuojUOoe-mD--pp1bLpxa-VksxVGkHaW92GrmAXVVvedmX3-3c0OjPwrRwOUfM-b5UVWHMBdXcN52Ir0q18HT_O7eB_xNfS3mglNpjxQvPJKr5Jq9qtPqvNvrHbOoj8tUU";

function insert_syscom_category_product(id_product_novusred,id_category_syscom,syscom_reference) {
    return new Promise(resolve => {
        var sql = `INSERT INTO ps_syscom_category_products (id_product_novusred, id_category_syscom, syscom_reference) VALUES (`+id_product_novusred+`, `+id_category_syscom+`, `+syscom_reference+`)
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

function get_categias_syscom() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`SELECT * FROM ps_categoriaSyscom;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_categias_syscom'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_categias_syscom');
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
            conn.query(`select id_product, reference, supplier_reference from ps_product where supplier_reference = "`+supplier_reference+`" and id_supplier = 4`, function (err, result) {
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

function getSyscom(cat) {
    return new Promise(resolve => {
        axios.get('https://developers.syscom.mx/api/v1/productos?categoria=' + cat + '&no_limit=1')
            //axios.get('http://localhost:3000/hola')
            .then((response) => {
                if (response.data) {
                    siHayProductos = true
                    var productosAPI = response.data.productos.length
                    var nuevoJson = []
                    if (productosAPI > 0) {
                        //llenar nuevo 
                        _.forEach(response.data.productos, function (val) {

                            jsonCompletoOrigen.push(val)
                        })

                        resolve({ mensaje: 'ok', data: nuevoJson })

                    } else {
                        console.log('no hay productos');
                    }
                } else {
                    resolve({ mensaje: 'no hay datos en el axios', data: {} })
                }
            })
            .catch(function (error) {
                console.log(error);
                resolve({ mensaje: 'error axios', data: {} })
            });
    });
}

let categoriasSyscom = [
    { id: 22, nombre: 'videovigilancia' },
    { id: 25, nombre: 'Radiocomunicacion' },
    { id: 26, nombre: 'Redes y audio' },
    { id: 27, nombre: 'IoT / GPS / Telemática y Luces de Emergencia' },
    { id: 30, nombre: 'Energía' },
    { id: 32, nombre: 'Automatización  e Intrusión' },
    { id: 37, nombre: 'Control  de Acceso ' },
    { id: 38, nombre: 'Detección  de Fuego' },
    { id: 65811, nombre: 'Cableado Estructurado' }
]

async function init(){

    console.log("se ha iniciado el proceso");
    //lista de productos repetidos
    const lista_categorias_syscom = await get_categias_syscom();
    // console.log(lista_categorias_syscom.length);

    
    //verificamos que existan productos repetidos
    if(lista_categorias_syscom.length>0){
        for (cat in categoriasSyscom) {
            var validator = await getSyscom(categoriasSyscom[cat].id) // datos del json
            if (validator.mensaje == 'ok') {
                // console.log(jsonCompletoOrigen[0]);

               
                for (key in jsonCompletoOrigen) {
                    let product = await get_product_by_supplier_reference(jsonCompletoOrigen[key]['producto_id']);
                    if(product[0]){
                        if(product[0]['id_product'] != undefined && product[0]['supplier_reference'] != undefined){
                            // console.log(product)
                            // console.log(product[0]['id_product'])
                            // console.log(product[0]['supplier_reference'])
                            let product_cat_sysc = jsonCompletoOrigen[key]['categorias'];
                            for(count_cat in product_cat_sysc){
                                console.log(product[0]['id_product'])
                                // console.log(product_cat_sysc[count_cat]);
                                insert_syscom_category_product(product[0]['id_product'],product_cat_sysc[count_cat]['id'],product[0]['supplier_reference'])
                            }
                        }
                    }
                    
                    
                }
            }
        }
        
        
    }
    
}
init();

