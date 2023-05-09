const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('./functions')
var fs = require('fs');
var Client = require('ftp');
const id_lang = 2
const id_tax = 53
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0 

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()
 
axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIn0.eyJhdWQiOiI2NlNOYWFKNzNOVzRxT3RpMEllWDNIVE1oUDVPVzVrRyIsImp0aSI6ImIzOWIzNzIyM2Q4NDcxOWRhZThkNmYxYTg4M2M0OGU3ZjdhNjljMWE0YjlmODExNWJjMTA3NGU1OGEzYTBkZTljMWYxYzA2MzU3NGY0MTdhIiwiaWF0IjoxNjMzNTYwMTY2LCJuYmYiOjE2MzM1NjAxNjYsImV4cCI6MTY2NTA5NjE2Niwic3ViIjoiIiwic2NvcGVzIjpbXX0.joiZTq_0Mcf3FLoNojUffGLcWjNA5cXnscN6zKW5rqB482Uy8HegilfHWGO_u2-sylz3RHtMsfnops4iin9QV1UEbbaziFC61UJZ2MZdqRgF_c74W1bmOCLKVa6Agde0V1qK3zhzscQy7_1FtM5qqwHg5z6LLhrX2pIJjiarF7L2oDaxba-SRkLcEdUJ-Gk922j5iqGM48kzDp2QR7PjdcatfpRZ6FpMLLB1fk2r52A5u3QjOaHAoG7WSOHjsNz9nWWyVbWxOI_B29RAG1A8zSDm1PjyM6EQIk-QMm90JvbUEIgDCGhrXer6HqyuNQ2Wh7hVTaiFU02kRrJurK8dBUSuPqEHN4a28bFZdUMd-wfGiZu_VTlYpoK-Wn0NnLjZ7HokWs5GQaLMG9wka-CooqzpyDU_bnraQBtOfqP8fsnWoeLk1o88aTeoCk5YXtBxTedLoAqvnqNXwcySvtAg96E1LKiojGIUGg7nQ4xbOcyguH4C5OJLgnYgJwsPcMoA_sNa2PcsDquVXO1zjpfigK_-84cjbUO5U1KQ3__hKUuojUOoe-mD--pp1bLpxa-VksxVGkHaW92GrmAXVVvedmX3-3c0OjPwrRwOUfM-b5UVWHMBdXcN52Ir0q18HT_O7eB_xNfS3mglNpjxQvPJKr5Jq9qtPqvNvrHbOoj8tUU";

let jsonCompletoOrigen = []
let tipoCambio = 0

function obtenerProductosTemporalesSyscomAdd() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            //SELECT * FROM ps_productos_syscom WHERE id_product = 0 
            conn.query("SELECT * FROM ps_productos_syscom WHERE id_product = 0 AND existencia > 0 AND precioFinal > 0", function (err, result) {
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

function getCategoriaSyscom(categoryId) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query("SELECT * FROM ps_categoriaSyscom WHERE apiId = " + categoryId,
                function (error, result) {
                    //console.log(result);
                    if (error) {
                        resolve({ mensaje: 'fail', data: error });
                    } else {
                        if (result[0]) {
                            if (result[0].prestaId) {
                                console.log('one');
                                resolve({ mensaje: 'ok', level: 1, prestaId: result[0].prestaId, name: result[0].nombre })
                            } else {
                                resolve({ mensaje: 'fail', data: 'no esta prestaId' });
                            }
                        } else {
                            resolve({ mensaje: 'fail', data: 'no existe en la consulta' });
                        }
                    }
                    conn.release();
                });
        })
    })
}

function obtenerProductosTemporalesSyscomUpdate() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            conn.query("SELECT * FROM ps_productos_syscom WHERE id_product > 0", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos btenerProductosTemporalesSyscomUpdate');
                        resolve(result)
                    } else {
                        console.log('no hay datos btenerProductosTemporalesSyscomUpdate');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function updateNotInJson() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            conn.query("SELECT id_product,reference FROM ps_product WHERE id_supplier = 4 AND reference NOT IN (SELECT clave FROM ps_productos_syscom)",
                function (err, result) {
                    if (err) {
                        resolve('fail');
                    } else {
                        var updateOne = []
                        _.forEach(result, function (value) {
                            updateOne.push(value.id_product)
                        });

                        if (updateOne) {
                            //actualizar a stock 0
                            conn.query("UPDATE ps_stock_available SET quantity = 0, physical_quantity = 0 WHERE id_product in (?) ", [updateOne], function (error, result) {
                                if (error) console.log('fail');
                                console.log('despues del update stock 0 - updateNotInJson');
                                console.log(result);
                            });

                            conn.query("UPDATE ps_feature_value_lang SET VALUE = 0 WHERE id_feature_value IN (SELECT id_feature_value FROM ps_feature_product WHERE id_product IN (?) AND id_feature = 63)", [updateOne], function (error, result) {
                                if (error) console.log('fail');
                                console.log('despues del update stock 0');
                                console.log(result);
                            });
                        }

                        resolve('ok')
                    }
                    conn.release();
                });
        })
    });
}

function asignProductsIds() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            //conn.query('UPDATE ps_productos_syscom INNER JOIN ps_product ON TRIM(ps_productos_syscom.clave) <=> TRIM(ps_product.reference ) SET ps_productos_syscom.id_product = IF(ps_product.id_product > 0, ps_product.id_product, 0) WHERE ps_product.id_supplier = 1',
            conn.query('UPDATE ps_productos_syscom AS dest,(SELECT id_product, reference, id_category_default FROM ps_product WHERE id_supplier = 4) AS src SET dest.id_product = src.id_product, dest.id_category = src.id_category_default WHERE dest.clave = src.reference',
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

function insertStock(idProduct, p, nuevoStock) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_stock_available(id_product,id_product_attribute,id_shop,id_shop_group,quantity,physical_quantity,out_of_stock) VALUES (?,?,?,?,?,?,?)', [idProduct, 0, 1, 0, nuevoStock, nuevoStock, 2], function (error, result) {
                if (err) console.log(err);
                if (error) console.log(error);

                resolve('ok')
                conn.release();
            });
        })
    })
}

function deleteTemporalProducts() {
    return new Promise(resolve => { 
        db.getConnection((err, conn) => {
            conn.query('DELETE FROM ps_productos_syscom ',
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

function insertDetalles(prod, idProduct) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            if (err) {
                resolve('inser Detalles: ' + idProduct + ' Fail')
            } else {
                conn.query('INSERT INTO ps_producto_detalles(product_id, referencia, model, nombre, marca, sat_key, descripcion, precio_especial, precio_descuento, precio_lista, alto, largo, ancho, peso, img_portada, link_privado, marca_logo, ups, ean, caracteristicas) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [idProduct, prod.producto_id, prod.modelo, globalFunc.cleanJustName(prod.titulo), prod.marca, prod.sat_key, prod.descripcion, prod.precios.precio_especial, prod.precios.precio_descuento, prod.precios.precio_lista, (prod.alto > 0) ? prod.alto : 0, (prod.largo > 0) ? prod.largo : 0, (prod.ancho > 0) ? prod.ancho : 0, (prod.peso > 0) ? prod.peso : 0, prod.img_portada, prod.link_privado, prod.marca_logo, '', '', ''],
                    function (error, result) {
                        if (error) {

                            resolve('inser Detalles: ' + idProduct + ' Fail')
                        } else {
                            resolve('detalles ok')
                        }
                        conn.release();
                    });
            }
        })

    })
}

function insertFiles(files, productoId) {
    return new Promise(resolve => {
        if (Object.keys(files).length > 0) {
            db.getConnection((err, conn) => {
                _.forEach(files, function (val) {
                    conn.query('INSERT IGNORE INTO ps_producto_files(id_product, nombre, path, mostrar) VALUES (?,?,?,?)', [productoId, val.recurso, val.path, 1],
                        function (error, result) {
                            if (error) {
                                console.log('insert file Fail')
                                console.log(err);
                            } else {
                                console.log('insert file OK');
                            }


                        });
                })
                resolve('ok')
                conn.release();
            })
        } else {
            console.log('no hay archivos');
            resolve('no hay archivos')
        }
    }) 
}

function insertPrductosSyscomTemporal(p) {
    return new Promise(resolve => {
        var sql = "INSERT IGNORE INTO ps_productos_syscom(idProduct, clave, nombre, modelo, activo, existencia, precio, moneda, tipoCambio, precioFinal,action, id_product, precioPromocion) VALUES ?"
        db.getConnection((err, conn) => {
            conn.query(sql, [p], function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del insert Product' + result);
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}

function getPrecioMxn(precios) {
    if (precios) {
        if (Object.keys(precios).length > 0) {
            var multiplicacion = precios.precio_descuento * tipoCambio
            var roundedPrice = _.round(multiplicacion, 4)
            return (parseFloat(roundedPrice))
        } else {
            return (0)
        }
        //obtenemos el tipo de cambio en mxn y convertimos
    } else {
        return (0)
    }
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

function getTipoCambioMXN() {
    return new Promise(resolve => {
        axios.get('https://developers.syscom.mx/api/v1/tipocambio')
            .then((response) => {
                if (response.data) {
                    tipoCambio = response.data.normal
                    resolve('ok')
                } else {
                    resolve('fail')
                }
            })
            .catch(function (error) {
                resolve('fail')
            });
    })
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

                            if (val.existencia && getExistencia(val.existencia) > 0) {
                                jsonCompletoOrigen.push(val)
                            }

                            // llenamos para tener la lista de los prods del json
                            nuevoJson.push({
                                idProduct: val.producto_id,
                                clave: val.producto_id,
                                nombre: val.titulo,
                                modelo: val.modelo,
                                activo: 1,
                                existencia: getExistencia(val.existencia),
                                precio: (val.precios.precio_descuento) ? val.precios.precio_descuento : 0,
                                moneda: "USD",
                                tipoCambio: tipoCambio,
                                precioFinal: getPrecioMxn(val.precios),
                                precioPromocion: 0
                            })
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

function saveJson() {
    return new Promise(resolve => {
        try {
            fs.writeFileSync('./syscom/json/File-' + moment().format('DD-MM-YYYY_HH-mm-ss') + '.json', JSON.stringify(jsonCompletoOrigen))
            resolve('ok')
        } catch (err) {
            console.error(err)
            resolve('fail')
        }
    })
}

function insertMarca(marca) {
    return new Promise(resolve => {
        console.log('entra en registrar la marca ');
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_manufacturer(name, date_add, date_upd,active) VALUES (?,?,?,?)',
                [marca, moment().format('YYYY-MM-DD HH:mm:ss'), moment().format('YYYY-MM-DD HH:mm:ss'), 1],
                function (error, result) {
                    if (error) {
                        resolve({ mensaje: 'fail', data: 0 });
                    } else {
                        resolve({ mensaje: 'ok', data: result.insertId })
                    }
                    conn.release();
                });
        })
    })
}

function insertMarcaLang(marcaId) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_manufacturer_lang(id_manufacturer,id_lang,description,short_description,meta_title,meta_keywords,meta_description) VALUES (?,?,?,?,?,?,?)', [marcaId, id_lang, '', '', '', '', ''],
                function (error, result) {
                    if (error) {
                        resolve({ mensaje: 'fail', data: 0 });
                    } else {
                        resolve({ mensaje: 'ok', data: result.insertId })
                    }
                    conn.release();
                });
        })
    })
}

function insertMarcaShop(marcaId) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_manufacturer_shop(id_manufacturer, id_shop) VALUES (?,?)', [marcaId, 1],
                function (error, result) {
                    if (error) {
                        resolve({ mensaje: 'fail', data: 0 });
                    } else {
                        resolve({ mensaje: 'ok', data: result.insertId })
                    }
                    conn.release();
                });
        })
    })
}

function updateStockPrice(sql) {
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

function insertProduct(p, bandId, category, supplier, date, getPrice) {
    console.log('dentro de funcion insertProduct');
    console.log([supplier, bandId, category, 1, p.producto_id, 0, date, date, getPrice, '', '301-category', '0000-00-00', 1]);

    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product(id_supplier,id_manufacturer,id_category_default,id_tax_rules_group,reference,cache_default_attribute,date_add,date_upd,price,unity,redirect_type, available_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)', [supplier, bandId, category, id_tax, p.producto_id, 0, date, date, getPrice, '', '301-category', '0000-00-00', 1], function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del insert Product' + result.insertId);
                resolve({ mensaje: 'ok', data: result.insertId })
                conn.release();
            });
        })
    })
}


function actualizarPorcentajesPorCategoria(){
    //con esta funcion obtenemos el porcentaje y las categorias que pertenecen a computadoras
    //const categoriasComputo = [1722,1750,2917,2921,2924,2926,2927];
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('UPDATE ps_productos_syscom SET porcentaje = CASE WHEN id_category IN (1722,1750,2917,2921,2924,2926,2927) THEN (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 0) ELSE (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 4) END WHERE  id_category IS NOT NULL', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria' );
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    })

}

function actualizarPrecioPorPorcentaje(){
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('UPDATE ps_productos_syscom SET precioMasPorcentaje = CASE WHEN precioFinal < 300 THEN (precioFinal) + (precioFinal* (SELECT porcentaje FROM ps_supplier_percentage WHERE id = 6 ) / 100.0) WHEN precioFinal > 300 AND precioPromocion > 0 THEN (precioPromocion) + ((precioPromocion) * porcentaje / 100.0) WHEN precioFinal > 300 AND precioFinal > 0 THEN (precioFinal) + ((precioFinal) * porcentaje / 100.0) WHEN porcentaje = 0 THEN precioFinal ELSE precioFinal END WHERE  id_product > 0 ', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria' );
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    }) 
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


async function asyncCall() {
    globalFunc.insertRegistro('UpdateSyscom hora de inicio: '+ horaInicio)
    console.log('Ejecutando Actualizacion SYSCOM 2 ')
    let horaInicio = moment().format('DD-MM-YYYY HH:mm:ss')
    await deleteTemporalProducts()
    let obtuvimosTipoCambio = (await getTipoCambioMXN() == 'ok') ? true : false
    if (obtuvimosTipoCambio) { // solo si obtenemos el tipo de cambioo 
        var countProducts2 = 1

        //aqui recorrremos todas la s categorias 
        // termiamos de recorrer todas las categorias
        // ######### recorremos cada categoria de syscom para llenar 

        for (cat in categoriasSyscom) {
            var validator = await getSyscom(categoriasSyscom[cat].id) // datos del json
            if (validator.mensaje == 'ok') {
                var jsonActive = validator.data
                var countProducts = 1
                var newArray = []

                for (key in jsonActive) {
                    console.log('producto # ' + countProducts2 + 'vuelta: ' + countProducts);
                    jsonActive[key].id_product = 0
                    jsonActive[key].action = 0
                    countProductsUpdate++

                    newArray.push([jsonActive[key].idProduct, jsonActive[key].clave, jsonActive[key].nombre, jsonActive[key].modelo, jsonActive[key].activo, jsonActive[key].existencia, jsonActive[key].precio, jsonActive[key].moneda, jsonActive[key].tipoCambio, jsonActive[key].precioFinal, jsonActive[key].action, jsonActive[key].id_product, jsonActive[key].precioPromocion])

                    if (countProducts == 500) { //insertamos cada X registros para no saturar la memoria
                        if (newArray.length > 0) {
                            console.log(await insertPrductosSyscomTemporal(newArray))
                            newArray = []
                            countProducts = 0
                        }
                    }
                    countProducts++
                    countProducts2++
                }
                if (newArray.length > 0) console.log(await insertPrductosSyscomTemporal(newArray))

            }
        }


        console.log('Termina de llenar los productos');
        console.log('###############################');

        porcentajeAumentoSupplier = await globalFunc.obtenerPorcentajeSupplier(4)
        console.log('porcentajeAumentoSupplier');
        console.log(porcentajeAumentoSupplier);

        porcentajeAumentoSupplier2 = await globalFunc.obtenerPorcentajeSupplier(99)
        console.log('porcentajeAumentoSupplier2');
        console.log(porcentajeAumentoSupplier2);

        //await saveJson() //save jsonDonaloades
        await asignProductsIds() //asignamos el id_product a la tabla productos_ct
        await actualizarPorcentajesPorCategoria() // ponemos el porcentajes que le sumaremos a ese producto 
        await actualizarPrecioPorPorcentaje() // ponemos el nuevo precio basandonos en el nuevo porcentaje 
        await updateNotInJson() //estos son los productos que estan en DB pero no en el json
    }

    //actualizamos los stocks y precios 
    // ############################
    var temporal = await obtenerProductosTemporalesSyscomUpdate()
    var countProductsUpdate = 1
    var listaToUpdate = ''

    for (key in temporal) {
        //actualizamos solo los que tenemos los id_product
        if (temporal[key].id_product) {
            //si se actualiza
            listaToUpdate += `UPDATE ps_stock_available, ps_product_shop, ps_product, ps_feature_value_lang SET ps_stock_available.quantity = ${temporal[key].existencia}, ps_stock_available.physical_quantity = ${temporal[key].existencia}, ps_product_shop.price = ${temporal[key].precioMasPorcentaje}, ps_product.date_upd = '${moment().format('YYYY-MM-DD HH:mm:ss')}',  ps_feature_value_lang.value = ${temporal[key].existencia} WHERE  ps_stock_available.id_product = ${temporal[key].id_product} AND ps_product_shop.id_product = ${temporal[key].id_product} AND ps_product.id_product = ${temporal[key].id_product} AND ps_feature_value_lang.id_feature_value = (SELECT id_feature_value FROM ps_feature_product WHERE id_feature = 63 AND id_product = ${temporal[key].id_product}) ; `;

            

            //await globalFunc.setActive(temporal[key].id_product, 1)
            if (countProductsUpdate == 500) {
                console.log('QUERY UPDATE')
            console.log(listaToUpdate)
            
                console.log('contador de 500');
                console.log('updateStockPrice responde');
                
                
                
                console.log( await updateStockPrice(listaToUpdate) )
                listaToUpdate = ''
                countProductsUpdate = 0
            }
        } else {
            //console.log('no tiene numero de roducto: ' + temporal[key]);
        }
        countProductsUpdate++
    }

    await updateStockPrice(listaToUpdate)
    const listapJson = await obtenerProductosTemporalesSyscomAdd()
    for (prod3 in listapJson) {

        var newPInsert = await getSyscomProductById(listapJson[prod3].idProduct)
        if (newPInsert.mensaje == 'ok') {

            // comprobar que tenga stock mayor a 0 para meterlo y que lo podamos vender 
            console.log('newPInsert');
            console.log(newPInsert.data);

            if (getExistencia(newPInsert.data.existencia) > 0 && getPrecioMxn(newPInsert.data.precios) > 0) {
                var nuevoStock = getExistencia(newPInsert.data.existencia)


                var nuevoPrecio2 = getPrecioMxn(newPInsert.data.precios)

                if(porcentajeAumentoSupplier>0){
                    var nuevoPrecio = (nuevoPrecio2 > 300) ? nuevoPrecio2 + 
                    (nuevoPrecio2*porcentajeAumentoSupplier/100 )  :  nuevoPrecio2 + 
                    (nuevoPrecio2*porcentajeAumentoSupplier2/100 )
                }else{
                    var nuevoPrecio = nuevoPrecio2
                }

                


                var idManufacturer = await globalFunc.getIdBrand(newPInsert.data.marca)
                let manufacturer = false


                if (idManufacturer > 0) {
                    console.log('si hay manufacturer');
                    manufacturer = true
                } else {
                    var marcaLastId = await insertMarca(newPInsert.data.marca)
                    if (marcaLastId.mensaje == 'ok') {
                        insertMarcaLang(marcaLastId)
                        insertMarcaShop(marcaLastId)
                    }
                }

                var idCategory = 2903 // base novus

                // si es mayor a 0 y menor que 3
                if (Object.keys(newPInsert.data.categorias).length > 0) {

                    //// nuevo categoria
                    var holaMundo = await getCategoriaSyscom(newPInsert.data.categorias[0].id)
                    if (holaMundo.mensaje = 'ok') {
                        if (holaMundo.prestaId) {
                            // aqui obtenemos el categoryprestashopGlobal 
                            idCategory = holaMundo.prestaId
                        } else {
                            console.log('no hay categoria prestashop se mete a global');
                            // await insertIntoPendiente(newP.line, newP.category, newP.parent_subcategory)
                        }

                    } else {
                        conn.query('INSERT INTO ps_categoriaSyscom_pendiente(nombre, apiId) VALUES (?,?)',
                            [newPInsert.data.categorias[0].nombre, newPInsert.data.categorias[0].id], function (error2, result2) {
                                if (error2) {
                                    console.log(error2);
                                } else {
                                    console.log('se registro como pendiente');
                                    conn.release();
                                }
                            });
                    }

                } else {
                    console.log('no tiene categorias o es mayor a 0');
                    console.log(newPInsert.data.producto_id);
                }

                var supplier = 4 // syscom

                // comprobamos que podemos adquirir sus propiedades antes de insertar el producto 
                var productoComplete = await getSyscomProductById(newPInsert.data.producto_id)

                if (productoComplete.mensaje == 'ok') {
                    saveMiniPicture = true // controlador para guardar MiniImagen una sola vez 
                    
                    var idLastNewProduct = await insertProduct(newPInsert.data, idManufacturer, idCategory, supplier, moment().format('YYYY-MM-DD HH:mm:ss'), nuevoPrecio)
                    if (idLastNewProduct.mensaje == 'ok' && manufacturer) {
                        if (idLastNewProduct.data != 0) {
                            await insertProductLang(idLastNewProduct.data, productoComplete.data)
                            await insertProductShop(idLastNewProduct.data, productoComplete.data, idCategory, moment().format('YYYY-MM-DD HH:mm:ss'), nuevoPrecio)
                            await insertProductSupplier(idLastNewProduct.data, supplier, getPrecioMxn(productoComplete.data.precios), nuevoPrecio)
                            await insertStock(idLastNewProduct.data, productoComplete.data, nuevoStock)
                            var lastCategoryId = await globalFunc.getLastCategoryId()

                            if (lastCategoryId.mensaje == 'ok') {
                                await globalFunc.insertCategoryProduct(idCategory, idLastNewProduct.data, lastCategoryId.data)
 
                                //agregarFotos
                                // hacer un foreach de las fotos si hay mas de una foto
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

                                var hasModelo = await globalFunc.insertFeatureValueCustom(1) // modelo
                                if (hasModelo.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(hasModelo.data, productoComplete.data.modelo, id_lang)
                                    await globalFunc.insertFeatureProduct(1, idLastNewProduct.data, hasModelo.data)
                                }

                                var hasPeso = await globalFunc.insertFeatureValueCustom(3) // peso
                                if (hasPeso.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(hasPeso.data, productoComplete.data.modelo, id_lang)
                                    await globalFunc.insertFeatureProduct(3, idLastNewProduct.data, hasPeso.data)
                                }

                                var hasStock = await globalFunc.insertFeatureValueCustom(63) // stock
                                if (hasStock.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(hasStock.data, nuevoStock, id_lang)
                                    await globalFunc.insertFeatureProduct(63, idLastNewProduct.data, hasStock.data)
                                }

                                var hasReference = await globalFunc.insertFeatureValueCustom(387) // referencia
                                if (hasReference.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(hasReference.data, productoComplete.data.producto_id, id_lang)
                                    await globalFunc.insertFeatureProduct(387, idLastNewProduct.data, hasReference.data)
                                }

                                var last_feature_value_idCustom3 = await globalFunc.insertFeatureValueCustom(388) // Referencia
                                if (last_feature_value_idCustom3.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_idCustom3.data, moment().format('YYYY-MM-DD HH:mm:ss'), id_lang) 
                                    await globalFunc.insertFeatureProduct(388, idLastNewProduct.data, last_feature_value_idCustom3.data)
                                }

                                await insertDetalles(productoComplete.data, idLastNewProduct.data)
                                await insertFiles(productoComplete.data.recursos, idLastNewProduct.data)
                            }
                        }
                    }
                    
                } else {
                    if (!manufacturer) {
                        console.log('no hay manufacturer para este producto');
                    } else {
                        console.log('no existe ese producto consulta syscom');
                    }
                }
            } else {
                //ignoredProducts.push()
                console.log('tiene producto 0 o no se puede vender, se ignora ');
                console.log(newPInsert);
            }
        } else {
            console.log('no hay producto');
        }

    } 

    console.log('Actualizacion terminada ###########################');
    console.log('Hora inicio: ' + horaInicio);
    console.log('Hora Termino: ' + moment().format('DD-MM-YYYY HH:mm:ss'));
    globalFunc.insertRegistro('UpdateSyscom hora de Fin: '+ horaInicio)
}

asyncCall()
