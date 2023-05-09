const axios = require('axios').default;
const _ = require('lodash')
const db = require('../db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('../functions')
const id_lang = 2
const id_tax = 53

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIn0.eyJhdWQiOiI2NlNOYWFKNzNOVzRxT3RpMEllWDNIVE1oUDVPVzVrRyIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIiwiaWF0IjoxNjMzNTYwMTY2LCJuYmYiOjE2MzM1NjAxNjYsImV4cCI6MTY2NTA5NjE2Niwic3ViIjoiIiwic2NvcGVzIjpbXX0.joiZTq_0Mcf3FLoNojUffGLcWjNA5cXnscN6zKW5rqB482Uy8HegilfHWGO_u2-sylz3RHtMsfnops4iin9QV1UEbbaziFC61UJZ2MZdqRgF_c74W1bmOCLKVa6Agde0V1qK3zhzscQy7_1FtM5qqwHg5z6LLhrX2pIJjiarF7L2oDaxba-SRkLcEdUJ-Gk922j5iqGM48kzDp2QR7PjdcatfpRZ6FpMLLB1fk2r52A5u3QjOaHAoG7WSOHjsNz9nWWyVbWxOI_B29RAG1A8zSDm1PjyM6EQIk-QMm90JvbUEIgDCGhrXer6HqyuNQ2Wh7hVTaiFU02kRrJurK8dBUSuPqEHN4a28bFZdUMd-wfGiZu_VTlYpoK-Wn0NnLjZ7HokWs5GQaLMG9wka-CooqzpyDU_bnraQBtOfqP8fsnWoeLk1o88aTeoCk5YXtBxTedLoAqvnqNXwcySvtAg96E1LKiojGIUGg7nQ4xbOcyguH4C5OJLgnYgJwsPcMoA_sNa2PcsDquVXO1zjpfigK_-84cjbUO5U1KQ3__hKUuojUOoe-mD--pp1bLpxa-VksxVGkHaW92GrmAXVVvedmX3-3c0OjPwrRwOUfM-b5UVWHMBdXcN52Ir0q18HT_O7eB_xNfS3mglNpjxQvPJKr5Jq9qtPqvNvrHbOoj8tUU";
let jsonCompletoOrigen = [];
let tipoCambio = 0;
let myArray ={};
let myArrayLength = 0;
let myArrayLastId = 0;
let porcentajeAumentoSupplier = 15;
let porcentajeAumentoSupplier2 = 30;

function getExistencia(existencia) {
    if (existencia) {
        if (Object.keys(existencia).length > 0) {
            if (existencia.nuevo) {
                return (existencia.nuevo);
            } else {
                return (0);
            }
        } else {
            return (0);
        }
        //obtenemos el tipo de cambio en mxn y convertimos
    } else {
        return (0);
    }

}
function getPrecioMxn(precios) {
    if (precios) {
        if (Object.keys(precios).length > 0) {
            var multiplicacion = precios.precio_descuento * tipoCambio;
            var roundedPrice = _.round(multiplicacion, 4);
            return (parseFloat(roundedPrice));
        } else {
            return (0);
        }
        //obtenemos el tipo de cambio en mxn y convertimos
    } else {
        return (0);
    }
}
function getTipoCambioMXN() {
    return new Promise(resolve => {
        axios.get('https://developers.syscom.mx/api/v1/tipocambio')
            .then((response) => {
                if (response.data) {
                    tipoCambio = response.data.normal;
                    resolve('ok');
                } else {
                    resolve('fail');
                }
            })
            .catch(function (error) {
                resolve('fail');
            });
    })
}
function getSyscom(cat) {
    return new Promise(resolve => {
        axios.get('https://developers.syscom.mx/api/v1/productos?categoria=' + cat + '&no_limit=1')
            //axios.get('http://localhost:3000/hola')
            .then((response) => {
                if (response.data) {
                    siHayProductos = true;
                    var productosAPI = response.data.productos.length;
                    var nuevoJson = [];
                    if (productosAPI > 0) {
                        //llenar nuevo 
                        _.forEach(response.data.productos, function (val) {

                            if (val.existencia && getExistencia(val.existencia) > 0) {
                                jsonCompletoOrigen.push(val);
                            }

                            // llenamos para tener la lista de los prods del json
                            nuevoJson.push({
                                idProduct: val.producto_id,
                                clave: val.producto_id,
                                nombre: val.titulo,
                                modelo: val.modelo,
                                sat_key: val.sat_key,
                                activo: 1,
                                existencia: getExistencia(val.existencia),
                                precio: (val.precios.precio_descuento) ? val.precios.precio_descuento : 0,
                                moneda: "USD",
                                tipoCambio: tipoCambio,
                                precioFinal: getPrecioMxn(val.precios),
                                precioPromocion: 0
                            });
                        })

                        resolve({ mensaje: 'ok', data: nuevoJson });

                    } else {
                        console.log('no hay productos');
                    }
                } else {
                    resolve({ mensaje: 'no hay datos en el axios', data: {} });
                }
            })
            .catch(function (error) {
                console.log(error);
                resolve({ mensaje: 'error axios', data: {} })
            });
    });
}
function insertProductosSyscom(p) {
    return new Promise(resolve => {
        var sql = "INSERT INTO `products` (`name`, `reference`, `description`, `price`, `model`, `sat_code`, `trademark`, `sold`, `stock`,`active`, `avalable_for_order`, `condition`, `state`, `supplier_id`, `manufacturer_id`, `created_at`, `updated_at`) VALUES ?";
        db.getConnection((err, conn) => {
            conn.query(sql, [p], function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del insert Product' + result);
                resolve({ mensaje: 'ok', data: result });
                conn.release();
            });
        })
    })
}

function obtenerProductosSyscomNovusred() {
    if(myArrayLastId>0){
        //si existe un último id se obtiene la lista de productos de syscom con id mayor al último id
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                // obtenemos todos los productos de syscom de la bd novusred
                conn.query("Select * from products Where supplier_id = 4 And id > "+myArrayLastId, function (err, result) {
                    if (err) {
                        resolve({ mensaje: 'error, no data DB', data: {} });
                    } else {
                        if (result.length > 0) {
                            console.log('si hay datos - obtenerProductosTemporalesSyscomAdd'); 
                            resolve(result)
                        } else {
                            console.log('no hay datos - obtenerProductosTemporalesSyscomAdd');
                            resolve(false)
                        }
                    }
                    conn.release();
                });
            })
        });
    }else{
        //se obtiene la lista de productos de syscom
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                // obtenemos todos los productos de syscom de la bd novusred
                conn.query("Select * from products Where supplier_id = 4", function (err, result) {
                    if (err) {
                        resolve({ mensaje: 'error, no data DB', data: {} });
                    } else {
                        if (result.length > 0) {
                            console.log('si hay datos - obtenerProductosTemporalesSyscomAdd'); 
                            resolve(result)
                        } else {
                            console.log('no hay datos - obtenerProductosTemporalesSyscomAdd');
                            resolve(false)
                        }
                    }
                    conn.release();
                });
            })
        });
    }
    
}

let categoriasSyscom = [
    // { id: 22, nombre: 'videovigilancia' },
    // { id: 25, nombre: 'Radiocomunicacion' },
    // { id: 26, nombre: 'Redes y audio' },
    // { id: 27, nombre: 'IoT / GPS / Telemática y Luces de Emergencia' },
    // { id: 30, nombre: 'Energía' },
    // { id: 32, nombre: 'Automatización  e Intrusión' },
    // { id: 37, nombre: 'Control  de Acceso ' },
    // { id: 38, nombre: 'Detección  de Fuego' },
    { id: 65811, nombre: 'Cableado Estructurado' }
];

function updateStockPrice(sql) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                resolve({ mensaje: 'ok', data: result });
                conn.release();
            });
        });
    });
}
async function arrayProductsNovusred(){
    //obteniendo lista de productos syscom en novusred
    console.log('myArrayLastId = '+myArrayLastId);
    const listProduct = await obtenerProductosSyscomNovusred();
    if(listProduct.length-1>0){
        // console.log('listProduct = '+listProduct.length)
        //creando arreglo y llenando con los productos de syscom de novusred
        for (key in listProduct) {
            myArray[listProduct[key]['reference']] = listProduct[key];
        }
    
        // console.log(listProduct[listProduct.length-1].id)
        //asignando valor de último id a myarraylastid
        myArrayLastId = listProduct[listProduct.length-1].id;
        // console.log('myArrayLastId = '+myArrayLastId)
    }

    // return myArray
}
function getSyscomProductById(idProduct) {
    return new Promise(resolve => {
        setTimeout(function () { // esperamos 7 segundos para no sobrepasar las consultas permitidas
            axios.get('https://developers.syscom.mx/api/v1/productos/' + idProduct)
                .then((response) => {
                    if (response.data) {
                        console.log('si llega producto getSyscomProductById');
                        console.log(response.data);
                        
                        resolve({ mensaje: 'ok', data: response.data })
                    } else {
                        console.log('no llega producto');
                        resolve({ mensaje: 'no hay datos en el axios', data: {} })
                    }
                })
                .catch(function (error) {
                    console.log(error);
                    resolve({ mensaje: 'error axios', data: {} })
                });
        }, 7000);
    });
}
function getExistencia(existencia) {
    if (existencia) {
        if (Object.keys(existencia).length > 0) {
            if (existencia.nuevo) {
                return (existencia.nuevo)
            } else {
                return (0)
            }
        } else {
            return (0)
        }
        //obtenemos el tipo de cambio en mxn y convertimos
    } else {
        return (0)
    }

}
function insertProductLang(idProduct, p) {
    return new Promise(resolve => {
        var cleanJustName = globalFunc.cleanJustName(p.titulo)
        var cleanNameString = globalFunc.cleanName(p.titulo)
        var nameNoSpecial4 = cleanNameString.replace(/  /g, ' ')
        var nameNoSpecial6 = nameNoSpecial4.split(' ').join('-')
        var nameInLinkFormat = nameNoSpecial6 + '-' + p.producto_id

        // limpiar descripcion de emojis
        var descripcionNueva2 = p.descripcion.replace(/  /g, ' ')
        var descripcionNueva3 = descripcionNueva2.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        var descripcionNueva4 = descripcionNueva3.replace(/ñ/gi, 'n');
        var descripcionNueva5 = descripcionNueva4.replace(/í/gi, 'i')

        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_lang(id_product, id_shop, id_lang, description, description_short, link_rewrite, meta_description, meta_keywords, meta_title, name) VALUES (?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, id_lang, descripcionNueva5, ' ', nameInLinkFormat, '', '', '', cleanJustName], function (error, result) {
                if (err) throw err;

                resolve('ok')
                conn.release();
            });
        })
    })
}
function insertProductShop(idProduct, p, category, date, price) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_shop(id_product,id_shop,id_category_default,id_tax_rules_group,price,unity,available_date,cache_default_attribute,DATE_ADD,date_upd,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, category, id_tax, price, '', '0000-00-00', 0, date, date, 1], function (error, result) {
                if (err) console.log(err);
                if (error) console.log(error);

                resolve('ok')
                conn.release();
            });
        })
    })
}
function insertProductSupplier(idProduct, idSupplier, productPrice) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_supplier(id_product, id_product_attribute, id_supplier, product_supplier_reference, product_supplier_price_te, id_currency ) VALUES (?,?,?,?,?,?)', [idProduct, 0, idSupplier, '', productPrice, 0], function (error, result) {
                if (error) {
                    resolve({ mensaje: 'insertProductSupplier fail', data: 0 });
                } else {
                    resolve({ mensaje: 'insertProductSupplier ok', data: result.insertId })
                }
                conn.release();
            });
        })
    })
}

async function asyncCall() {
    console.log('Ejecutando Actualizacion Laravel ')
    
    var countProducts2 = 1;
    var countProductsUpdate = 1;
    let horaInicio = moment().format('DD-MM-YYYY HH:mm:ss');
    //obtenemos productos actuales de syscom
    await arrayProductsNovusred();

    //obtenemos tipo de cambio de syscom
    let obtuvimosTipoCambio = (await getTipoCambioMXN() == 'ok') ? true : false;

    //recorremos lista de categorias de syscom
    for (cat in categoriasSyscom) {

        //obtenemos los productos de syscom de la categoria actual
        var validator = await getSyscom(categoriasSyscom[cat].id); // datos del json

        if (validator.mensaje == 'ok') {
            var jsonActive = validator.data;
            var countProducts = 1;


            //variables nuevas
            var newArraySyscomInsert = [];
            var contadorInsert = 0;
            var contadorUpdate = 0;
            var listaToUpdate = '';

            for (key in jsonActive) {
                console.log('producto # ' + countProducts2 + 'vuelta: ' + countProducts);
                let precio_mas_porcentaje = 0;
                if(jsonActive[key].precioFinal>500){
                    precio_mas_porcentaje = jsonActive[key].precioFinal*1.15;
                }else{
                    precio_mas_porcentaje = jsonActive[key].precioFinal*1.30;
                }
                if(myArray[jsonActive[key].clave]){

                    //productos a actualizar           
                    
                    listaToUpdate += `UPDATE products SET stock = ${jsonActive[key].existencia}, price = ${precio_mas_porcentaje} WHERE id = ${myArray[jsonActive[key].clave].id}; `;
                    
                    if (contadorUpdate == 500) {
                        // console.log('QUERY UPDATE')
                        // console.log(listaToUpdate)
                        // console.log('contador de 500');
                        // console.log('updateStockPrice responde');  
                        // console.log(  )
                        await updateStockPrice(listaToUpdate);
                        listaToUpdate = '';
                        contadorUpdate = 0;
                    }
                    contadorUpdate++;
                    
                }else{
                    //productos a crear
                    
                    newArraySyscomInsert.push([jsonActive[key].nombre, jsonActive[key].clave, 'descripción',precio_mas_porcentaje, jsonActive[key].modelo, jsonActive[key].sat_key,'hola',0,jsonActive[key].existencia,jsonActive[key].activo , 1,'new',1,4,1, moment().format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss')]);

                    if (contadorInsert == 500) { //insertamos cada X registros para no saturar la memoria
                        if (newArraySyscomInsert.length > 0) {
                            console.log(await insertProductosSyscom(newArraySyscomInsert));
                            newArraySyscomInsert = [];
                            contadorInsert = 0;
                        }
                    }
                    var productoComplete = await getSyscomProductById(newPInsert.data.producto_id)
                    if(productoComplete.mensaje == 'ok'){
                        if (Object.keys(productoComplete.data.imagenes).length > 1) {
                            var ordenImagenes = 1
                            try {
                                for (image in productoComplete.data.imagenes) {
                                    var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, ordenImagenes, (ordenImagenes == 1) ? 1 : null)
                                    await globalFunc.saveImagesToPath(productoComplete.data.imagenes[image].imagen, idImagen, 'syscom')
                                    await globalFunc.insertImageLang(idImagen, productoComplete.data.titulo + '-' + productoComplete.data.producto_id, id_lang)
                                    await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, (ordenImagenes == 1) ? 1 : null)
                                    ordenImagenes++
    
                                }    
                            } catch (error) {
                                console.log('error agregando imagenes #############');
                                
                            }
                            
                        } else { // solo insertar la imagen de portada
                            if (productoComplete.data.img_portada != '') {
                                try {
                                    var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                    await globalFunc.saveImagesToPath(productoComplete.data.img_portada, idImagen, 'syscom')
                                    await globalFunc.insertImageLang(idImagen, productoComplete.data.titulo, id_lang)
                                    await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                } catch (error) {
                                    
                                }
                                
                             
                            } else {
                                try {
                                    var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                    await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", idImagen, 'syscom')
                                    await globalFunc.insertImageLang(idImagen, 'defaultImg', id_lang)
                                    await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                } catch (error) {
                                    
                                }
                                // agregamos imagen default del producto, ya que no tiene imagen portada
                             
                            }
                        }  
                    }else{
                        console.log('no existe ese producto consulta syscom');
                    }
                   

                    contadorInsert++;
                    
                }
                countProducts++;
                countProducts2++;
            }

            if (listaToUpdate) console.log(await updateStockPrice(listaToUpdate));
            if (newArraySyscomInsert.length > 0) console.log(await insertProductosSyscom(newArraySyscomInsert));
            newArraySyscomInsert = [];
            listaToUpdate = '';
            
            await arrayProductsNovusred();
            
        }
    }
    console.log('finish');
    
}

// asyncCall()
// const listapJson = await obtenerProductosSyscomNovusred()
async function prueba(){
    await arrayProductsNovusred();
    await arrayProductsNovusred();
    // console.log(myArray[87440])

    // var validator = await getSyscom(categoriasSyscom[0].id)
}
asyncCall();
// prueba()