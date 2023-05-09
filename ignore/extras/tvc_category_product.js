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

axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjIxM2M1ZDE2OWJkZTE2YmEyOGEzOWE5ZDExN2EwZmI2ZDliM2Q1NzBkNGVlZDI3NDU3ODNhYTdjZTQwMTkyZDRjMWJkOGY3YTY5YThmM2NiIn0.eyJhdWQiOiIyIiwianRpIjoiMjEzYzVkMTY5YmRlMTZiYTI4YTM5YTlkMTE3YTBmYjZkOWIzZDU3MGQ0ZWVkMjc0NTc4M2FhN2NlNDAxOTJkNGMxYmQ4ZjdhNjlhOGYzY2IiLCJpYXQiOjE2MzQyNTI1MzksIm5iZiI6MTYzNDI1MjUzOSwiZXhwIjoxNjY1Nzg4NTM5LCJzdWIiOiI0NzE0MSIsInNjb3BlcyI6WyJtb2JpbGUiXX0.BVZzJYbtH-RZITRBOmwwRBAc1mh0zYm1siUtmhj1BfRkjwZc4m-iuaLm2HNUdt4VdlRk-6OkIEUpA9W277ki2xfdFNF9xEsQPb-kGc-MleNaE0wEQTxawUqDpLxPh7F-GA9zOb7xyv783BKWOfKBekIu1kVDfCXjsK23ELc5KgRHv1uW6AgjIAoKOw2FYYw3a5BgJjb1PKSGjhFKuyXYd2tUVYpBveK_-PeSGe8RGcLPY0aZ-gsusBPsx9RcM2GlbUgRx0kgYyCXaNCYeMjGTh3uQL3K153yoUy5xhrk28dfLC768oyyovpRKU0Fes7yL_STTn0IocIfFPWLFNUCkBm3u70Hc1JoygRRv4oImUZyJ9M8LwtPrM1qmEYp2EKaecxGPJZEgmzXKmxBXvI-Xt1tBtkVz1iso-H86EIEttP-RhTKlwVav5uITQbqvEcGn4iufTvgbDMGVa4dub9MsJdnSE-dg3Uesj9s3vGmUVOyuz0pGiFdD6QD6pg79RDHzsm1x3XZ4MPBp0khLoSWXEW9b86U2RKnOvFDrSXJ8g6hv44QbmOBXjEoaS20S0EV_5iSB_Y7MeSqBlLzGKHaQQ75H4V_l_4qWQjTXTkkJoD9rpwEw5rZdlBOMIhuFAviAV4K4eY5ESF_CGbx9sEbMGT9Fmp7DkNIvfkqFKwuK-M";

function insert_category_product(id_product_novusred,id_tvc_category,tvc_reference) {
    console.log(id_product_novusred,id_tvc_category,tvc_reference)
    return new Promise(resolve => {
        var sql = `INSERT INTO ps_tvc_category_products (id_product_novusred, id_tvc_category, tvc_reference) VALUES (`+id_product_novusred+`, `+id_tvc_category+`, "`+tvc_reference+`")
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

function get_categias_tvc(idCategoria) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`SELECT * FROM ps_categoriaTvc where apiId = `+idCategoria+`;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_categias_tvc'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_categias_tvc');
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
            conn.query(`select id_product, reference, supplier_reference from ps_product where supplier_reference = "`+supplier_reference+`" and id_supplier = 1`, function (err, result) {
                // console.log(`select id_product, reference, supplier_reference from ps_product where supplier_reference = "`+supplier_reference+`" and id_supplier = 1`)
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    console.log(result)
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

function getAxios(page) {
    return new Promise(resolve => {
        axios.get('http://api.tvc.mx/products?withPrice=true&withInventory=simple&withOverviews=true&withMedia=true&withCategoryBreadcrumb=true&perPage=1000&withWeightsAndDimensions=true&page=' + page)
            //axios.get('http://localhost:3000/hola')
            .then((response, err) => {
                if (response.data.data) {
                    var nuevoJson = []
                    _.forEach(response.data.data, function (val) {

                        jsonCompletoOrigen.push(val)
                        
                    })


                    resolve({ mensaje: 'ok', data: nuevoJson })
                } else {
                    resolve({ mensaje: 'fail', data: {} })
                }
            })
            .catch(function (error) {
                resolve({ mensaje: 'error axios', data: error })
            });
    });
}

async function init(){
    for (var i = 1; i <= 5; i++) {
        var validator = await getAxios(i) // datos del json

        if (validator.mensaje == 'ok') {
            for (key in jsonCompletoOrigen) {
                // console.log(jsonCompletoOrigen[2]);
                let product = await get_product_by_supplier_reference(jsonCompletoOrigen[key]['tvc_id']);
                if(product[0]){
                    let category = await get_categias_tvc(jsonCompletoOrigen[key]['category_id']);
                    if(category[0]){
                        // console.log(product[0])
                        // console.log(category[0])
                        console.log(product[0]['id_product']);
                        insert_category_product(product[0]['id_product'],category[0]['apiId'],product[0]['supplier_reference']);

                    }
                    
                }
                
            }
            jsonCompletoOrigen = [];
            // console.log(jsonCompletoOrigen);
        }
    }
    
}
init();

