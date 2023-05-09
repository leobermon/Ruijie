const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment-timezone');
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

axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6ImMzNDE0OGNmMWIxZGQwZDMzYjZjMzFmZTBhM2E0ZTllZjVlYjQ2NTVkOTAyYWU0YWRmZjlhMjRhZTBiNTk2NzVhNzQ1YWFiOTJkN2RjMzk4In0.eyJhdWQiOiIyIiwianRpIjoiYzM0MTQ4Y2YxYjFkZDBkMzNiNmMzMWZlMGEzYTRlOWVmNWViNDY1NWQ5MDJhZTRhZGZmOWEyNGFlMGI1OTY3NWE3NDVhYWI5MmQ3ZGMzOTgiLCJpYXQiOjE2ODIxMTg3MjcsIm5iZiI6MTY4MjExODcyNywiZXhwIjoxNzEzNzQxMTI3LCJzdWIiOiIyMTk1NDgiLCJzY29wZXMiOlsibW9iaWxlIl19.cg9rv7YAEXpWEuUtQAnE64jgq1JSs-ELgtE2m23bk2cZSl7So1Mxttgl7xyBrvTgwePBl-F30lCxYWVjQlnLLysGMq4G81n0oa9_XHajbIVqHB2ECjzjyTUm8TiX_aF7AVUk8HFhkQE9RYDkwZnMnZMeKtDTrQ_zirogLK4kCex9OyvAMKrh0wGvhN-0629JtITE7xOekYZlVcIMp2VO4HLHRCbw8C5_yyx3NN7Bju65Na8hRxlSlBTrBFcKemgDVgPJx0VSpNw4iuVE4RYHyEGh2mRQfbJBs6os4UwPm5uFN7_urudHVkXfSOYKuPLCXOxGNrIwutqzNcueUHpGM2P2T9T0Xw9OnE3XKx3CL3IqZxUclcNG4JzuqQt9dcpirWXUWbQLyLQKWJmhyAB8zYe_WIJqjs7ScVxgWNzrpWgSEjWQHWre2lzm8KkyXBYMBvDubvKvfjR_xmvdeBcqHzQwLcy79jCnqS1AgEBe8Zpgc77d5ZbiOrU1gI0Mr5txsIbSOjdTUuStQ7HHnzoSOGPCSgZVh0vZTMydgL-Jos-ctT2iiGeIUySWStz-tXHwI8OK62FmmgDpjx_n-G2dyTkp8Q9YO9utaeqZlxs56jaj_1g5Pu_aVTp957G-zSaya9MGQLej8rWottxXf9hNJI9EGecwhK62fMI4sHSx4WI";

let jsonCompletoOrigen = []
let tipoCambio = 0


function getPrecioMxn(precios) {
    if (precios != '') {
        var multiplicacion = precios * tipoCambio
        var roundedPrice = _.round(multiplicacion, 4)
        return (parseFloat(roundedPrice))
    } else {
        return (0)
    }
    //obtenemos el tipo de cambio en mxn y convertimos
}

function obtenerProductosTemporalesTvcAdd() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            //SELECT * FROM ps_productos_tvc WHERE id_product = 0 
            conn.query("SELECT * FROM ps_productos_tvc WHERE id_product = 0 AND existencia > 0", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos');
                        resolve(result)
                    } else {
                        console.log('no hay datos ');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
}

function getCategoriaTvc(category, subCategoria, line) {
    return new Promise(resolve => {
        var subCategoria2 = subCategoria.trim()
        var line2 = line.trim()

        db.getConnection((err, conn) => {
            conn.query("SELECT * FROM ps_categoriaTvc WHERE apiId = " + category,
                function (error, result) {
                    if (error) {
                        resolve(error);
                    } else {
                        if (result[0]) {
                            if (result[0].prestaId) {
                                resolve({ level: 1, prestaId: result[0].prestaId, name: result[0].sub })
                            } else {
                                resolve({ level: 0, id: result[0].id })
                            }
                        } else {
                            conn.query('INSERT INTO ps_categoriaTvc_pendiente(sub, apiId, nombre ) VALUES (?,?,?)',
                                [line2, category, subCategoria2], function (error2, result2) {
                                    if (error2) {
                                        console.log(error2);
                                    } else {
                                        resolve({ level: 0, id: 0 })
                                        conn.release();
                                    }
                                });
                        }
                        resolve(result);
                    }
                    conn.release();
                });
        })
    })
}

function obtenerProductosTemporalesTvcUpdate() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            conn.query("SELECT * FROM ps_productos_tvc WHERE id_product > 0", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos');
                        resolve(result)
                    } else {
                        console.log('no hay datos ');
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
            conn.query("SELECT id_product,supplier_reference FROM ps_product WHERE id_supplier = 1 AND TRIM(supplier_reference) NOT IN (SELECT TRIM(clave) FROM ps_productos_tvc)",
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
                                console.log('despues del update stock 0');
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
            //conn.query('UPDATE ps_productos_tvc INNER JOIN ps_product ON TRIM(ps_productos_tvc.clave) <=> TRIM(ps_product.reference ) SET ps_productos_tvc.id_product = IF(ps_product.id_product > 0, ps_product.id_product, 0) WHERE ps_product.id_supplier = 1',
            conn.query('UPDATE ps_productos_tvc AS dest,(SELECT id_product, supplier_reference, id_category_default FROM ps_product WHERE id_supplier = 1) AS src SET dest.id_product = src.id_product, dest.id_category = src.id_category_default WHERE dest.clave = src.supplier_reference',
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
        var cleanJustName = globalFunc.cleanJustName(p.name)
        var cleanNameString = globalFunc.cleanName(p.name)
        var nameNoSpecial4 = cleanNameString.replace(/  /g, ' ')
        var nameNoSpecial6 = nameNoSpecial4.split(' ').join('-')
        var nameInLinkFormat = nameNoSpecial6 + '-' + p.tvc_id
        var descripcionNueva = ""
        let stringLowerCase = cleanJustName.toLocaleLowerCase();
        let stringUpperCase = stringLowerCase
        .split(/ /g).map(word =>
            `${word.substring(0,1).toUpperCase()}${word.substring(1)}`)
        .join(" ");
        // limpiar description, removiendo emojis y caracteres especiales
        if (Object.keys(p.overviews).length > 0) { // si existen overviews
            if (Object.keys(p.overviews).length == 1) { // si solo tiene un overview
                descripcionNueva = p.overviews[0].description
            } else if (Object.keys(p.overviews).length > 1) { // si tiene mas de 1 overview
                _.forEach(p.overviews, function (value) {

                    descripcionNueva += "<h3>" + value.title + "</h3> <br> "
                    descripcionNueva += value.description

                    if (value.image_path) {
                        descripcionNueva += `<br> <img src="https://tvc.mx` + value.image_path + `" >`
                    }

                });
            }
        }

        var descripcionNueva2 = descripcionNueva.replace(/  /g, ' ')
        var descripcionNueva3 = descripcionNueva2.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        var descripcionNueva4 = descripcionNueva3.replace(/ñ/gi, 'n');
        var descripcionNueva5 = descripcionNueva4.replace(/í/gi, 'i')

        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_lang(id_product, id_shop, id_lang, description, description_short, link_rewrite, meta_description, meta_keywords, meta_title, name) VALUES (?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, id_lang, '<p>' + descripcionNueva5 + '</p>', ' ', nameInLinkFormat, '', '', '', stringUpperCase], function (error, result) {
                if (err) throw err;
                resolve('ok')
                conn.release();
            });
        })

    })
}

function insertProductShop(idProduct, p, category, date, getPrice) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_shop(id_product,id_shop,id_category_default,id_tax_rules_group,price,unity,available_date,cache_default_attribute,DATE_ADD,date_upd,active) VALUES (?,?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, category, id_tax, getPrice, '', '0000-00-00', 0, date, date, 1], function (error, result) {
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

function insertStock(idProduct, getStock) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_stock_available(id_product,id_product_attribute,id_shop,id_shop_group,quantity,physical_quantity,out_of_stock) VALUES (?,?,?,?,?,?,?)', [idProduct, 0, 1, 0, getStock, getStock, 2], function (error, result) {
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
            conn.query('DELETE FROM ps_productos_tvc ',
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
                var descripcionNueva = ""
                // limpiar description, removiendo emojis y caracteres especiales
                if (Object.keys(prod.overviews).length > 0) { // si existen overviews
                    if (Object.keys(prod.overviews).length == 1) { // si solo tiene un overview
                        descripcionNueva = prod.overviews[0].description
                    } else if (Object.keys(prod.overviews).length > 1) { // si tiene mas de 1 overview
                        _.forEach(prod.overviews, function (value) {
                            descripcionNueva += "<h3>" + value.title + "</h3> <br> "
                            descripcionNueva += value.description

                            if (value.image_path) {
                                descripcionNueva += `<br> <img src="https://tvc.mx` + value.image_path + `" >`
                            }

                        });
                    }
                }

                var descripcionNueva2 = descripcionNueva.replace(/  /g, ' ')
                var descripcionNueva3 = descripcionNueva2.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
                var descripcionNueva4 = descripcionNueva3.replace(/ñ/gi, 'n');
                var descripcionNueva5 = descripcionNueva4.replace(/í/gi, 'i')

                if (prod.weights_and_dimensions) {
                    var vAlto = (prod.weights_and_dimensions.piece_height) ? _.round(prod.weights_and_dimensions.piece_height, 1) : 0
                    var vLargo = (prod.weights_and_dimensions.piece_length) ? _.round(prod.weights_and_dimensions.piece_length, 1) : 0
                    var vAncho = (prod.weights_and_dimensions.piece_width) ? _.round(prod.weights_and_dimensions.piece_width, 1) : 0
                    var vPeso = (prod.weights_and_dimensions.piece_weight) ? _.round(prod.weights_and_dimensions.piece_weight, 1) : 0
                } else {
                    var vAlto = 0
                    var vLargo = 0
                    var vAncho = 0
                    var vPeso = 0
                }


                conn.query('INSERT INTO ps_producto_detalles(product_id, referencia, model, nombre, marca, sat_key, descripcion, precio_especial, precio_descuento, precio_lista, alto, largo, ancho, peso, img_portada, link_privado, marca_logo, ups, ean, caracteristicas) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [idProduct, prod.tvc_id, prod.provider_model, globalFunc.cleanJustName(prod.name), prod.brand, prod.sat_key, descripcionNueva5, getPrecioMxn(prod.distributor_price), getPrecioMxn(prod.distributor_price), prod.list_price, vAlto, vLargo, vAncho, vPeso, '', '', '', '', '', ''],
                    function (error, result) {
                        if (error) {
                            console.log('error');
                            console.log(error);

                            resolve('inser Detalles: ' + idProduct + ' Fail')
                        } else {
                            console.log(result);
                            resolve('detalles ok')
                        }
                        conn.release();
                    });
            }
        })

    })
}

function getAxios(page) {
    return new Promise(resolve => {
        axios.get('https://api.tvc.mx/products?withPrice=true&withInventory=simple&withOverviews=true&withMedia=true&withCategoryBreadcrumb=true&perPage=1000&withWeightsAndDimensions=true&page=' + page)
            //axios.get('http://localhost:3000/hola')
            .then((response, err) => {
                if (response.data.data) {
                    var nuevoJson = []
                    _.forEach(response.data.data, function (val) {

                        if ((val.total_inventories) && (val.total_inventories > 0)) {
                            jsonCompletoOrigen.push(val)
                        }


                        // llenamos para tener la lista de los prods del json
                        nuevoJson.push({
                            idProduct: val.tvc_id,
                            clave: val.tvc_id,
                            nombre: val.name,
                            modelo: val.provider_model,
                            activo: 1,
                            existencia: (val.total_inventories) ? val.total_inventories : 0,
                            precio: val.distributor_price,
                            moneda: 'USD',
                            tipoCambio: tipoCambio,
                            precioFinal: getPrecioMxn(val.distributor_price),
                            precioPromocion: getPrecioMxn(val.distributor_price)
                        })
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

function insertFiles(files, productoId) {
    return new Promise(resolve => {
        if (Object.keys(files).length > 0) {
            console.log('entra a los archivos para agregar');
            db.getConnection((err, conn) => {
                _.forEach(files, function (val) {
                    conn.query('INSERT IGNORE INTO ps_producto_files(id_product, nombre, path, mostrar) VALUES (?,?,?,?)', [productoId, 'Documento Pdf', 'http://api.tvc.mx' + val, 1],
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

function insertPrductosTvcTemporal(p) {
    return new Promise(resolve => {
        var sql = "INSERT INTO ps_productos_tvc(idProduct, clave, nombre, modelo, activo, existencia, precio, moneda, tipoCambio, precioFinal,action, id_product, precioPromocion) VALUES ?"
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

function getTipoCambioMXN() {
    return new Promise(resolve => {
        axios.get('https://api.tvc.mx/exchange-rates')
            .then((response) => {
                if (response.data) {
                    console.log('aqui llega el tipo de cambio');
                    console.log(response.data);


                    tipoCambio = response.data
                    resolve('ok')
                } else { //hijo de puieta
                    resolve('fail')
                }
            })
            .catch(function (error) {
                resolve('fail')
                console.log('resolve fail');
                console.log(error);
            });
    })
}



function saveJson() {
    return new Promise(resolve => {
        try {
            fs.writeFileSync('./tvc/json/File-' + moment().format('DD-MM-YYYY_HH-mm-ss') + '.json', JSON.stringify(jsonCompletoOrigen))
            resolve('ok')
        } catch (err) {
            console.error(err)
            resolve('fail')
        }
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



function insertProduct(p, bandId, category, supplier, date, getPrice) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product(id_supplier,id_manufacturer,id_category_default,id_tax_rules_group,supplier_reference,reference,mpn,cache_default_attribute,date_add,date_upd,price,unity,redirect_type, available_date,active) VALUES ('+supplier+', '+bandId+', '+category+', '+id_tax+', "'+p.tvc_id+'","'+p.provider_model+'","'+p.provider_model+'", 0, "'+date+'", "'+date+'", '+getPrice+', "", "301-category", "0000-00-00", 1)', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('aqui 2');
                console.log(error);
                console.log('despues del insert Product' + result.insertId);
                resolve({ mensaje: 'ok', data: result.insertId })
                conn.release();
            });
        })
    })
}
function insertCategoryProduct(id_product, id_category) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_category_product(id_category, id_product, position) VALUES ('+id_category+', '+id_product+', 0)', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                
                console.log(error);
                console.log('despues de insert category product');
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
            conn.query('UPDATE ps_productos_tvc SET porcentaje = CASE WHEN id_category IN (1722,1750,2917,2921,2924,2926,2927) THEN (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 0) ELSE (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 1) END WHERE  id_category IS NOT NULL', function (error, result) {
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
            conn.query('UPDATE ps_productos_tvc SET precioMasPorcentaje = CASE WHEN precioFinal < 300 THEN (precioFinal) + (precioFinal* (SELECT porcentaje FROM ps_supplier_percentage WHERE id = 6 ) / 100.0) WHEN precioFinal > 300 AND precioPromocion > 0 THEN (precioPromocion) + ((precioPromocion) * porcentaje / 100.0) WHEN precioFinal > 300 AND precioFinal > 0 THEN (precioFinal) + ((precioFinal) * porcentaje / 100.0) WHEN porcentaje = 0 THEN precioFinal ELSE precioFinal END WHERE  id_product > 0 ', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria' );
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    }) 
}

async function asyncCall() {

    console.log('Ejecutando Actualizacion TVC 2 ')
    let horaInicio = moment().format('DD-MM-YYYY HH:mm:ss')
    var countProductsUpdate = 0
    await deleteTemporalProducts()
    let obtuvimosTipoCambio = (await getTipoCambioMXN() == 'ok') ? true : false

    if (obtuvimosTipoCambio) { // solo si obtenemos el tipo de cambioo 

        var countProducts2 = 1
        for (var i = 1; i <= 5; i++) { //damos 5 vueltas, para obetenr 5 mil productos. mil x vuelta
            var validator = await getAxios(i) // datos del json

            if (validator.mensaje == 'ok') {
                var jsonActive = validator.data
                var countProducts = 1
                var newArray = []

                for (key in jsonActive) {
                    jsonActive[key].id_product = 0
                    jsonActive[key].action = 0
                    countProductsUpdate++

                    newArray.push([jsonActive[key].idProduct, jsonActive[key].clave, jsonActive[key].nombre, jsonActive[key].modelo, jsonActive[key].activo, jsonActive[key].existencia, jsonActive[key].precio, jsonActive[key].moneda, jsonActive[key].tipoCambio, jsonActive[key].precioFinal, jsonActive[key].action, jsonActive[key].id_product, jsonActive[key].precioPromocion])

                    if (countProducts == 500) { //insertamos cada X registros para no saturar la memoria
                        if (newArray.length > 0) {
                            console.log(await insertPrductosTvcTemporal(newArray))
                            newArray = []
                            countProducts = 0
                        }
                    }
                    countProducts++
                    countProducts2++
                }
                if (newArray.length > 0) console.log(await insertPrductosTvcTemporal(newArray))

            }
        }


        porcentajeAumentoSupplier = await globalFunc.obtenerPorcentajeSupplier(1)
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

    var temporal = await obtenerProductosTemporalesTvcUpdate()
    var countProductsUpdate = 1
    var listaToUpdate = ''

    for (key in temporal) {
        //actualizamos solo los que tenemos los id_product
        if (temporal[key].id_product) {


            //si se actualiza
            listaToUpdate += `UPDATE ps_stock_available, ps_product_shop, ps_product, ps_feature_value_lang SET ps_stock_available.quantity = ${temporal[key].existencia}, ps_stock_available.physical_quantity = ${temporal[key].existencia}, ps_product_shop.price = ${temporal[key].precioMasPorcentaje}, ps_product.date_upd = '${moment().format('YYYY-MM-DD HH:mm:ss')}', ps_feature_value_lang.value = ${temporal[key].existencia} WHERE ps_stock_available.id_product = ${temporal[key].id_product} AND ps_product_shop.id_product = ${temporal[key].id_product} AND ps_product.id_product = ${temporal[key].id_product} AND ps_feature_value_lang.id_feature_value = (SELECT id_feature_value FROM ps_feature_product WHERE id_feature = 63 AND id_product = ${temporal[key].id_product}) ; `;

            //await globalFunc.setActive(temporal[key].id_product, 1)
            if (countProductsUpdate == 500) {
                await updateStockPrice(listaToUpdate)
                listaToUpdate = ''
                countProductsUpdate = 0
            }

        } else {
            //console.log('no tiene numero de roducto: ' + temporal[key]);
        }
        countProductsUpdate++
    }

    await updateStockPrice(listaToUpdate)



    // 3 - #### aqui se agregarn los productos neuvos 
    const productosParaAgregar = await obtenerProductosTemporalesTvcAdd()
    if (productosParaAgregar) {

        for (prod3 in productosParaAgregar) {
            var newP = _.find(jsonCompletoOrigen, { 'tvc_id': productosParaAgregar[prod3].idProduct })
            if (newP) {

                console.log('newP');
                console.log(newP);



                var getPrice2 = getPrecioMxn(newP.distributor_price)

                console.log('getPrice2');
                console.log(getPrice2);
                
                

                

                if(porcentajeAumentoSupplier>0){
                    var getPrice = (getPrice2 > 300) ? getPrice2 + 
                    (getPrice2*porcentajeAumentoSupplier/100 )  :  getPrice2 + 
                    (getPrice2*porcentajeAumentoSupplier2/100 )
                }else{
                    var getPrice = getPrice2
                }

                console.log('getPrice');
                console.log(getPrice);



                let getStock = (newP.total_inventories) ? newP.total_inventories : 0

                if (getStock > 0) {

                    var idManufacturer = await globalFunc.getIdBrand(newP.brand.trim())
                    console.log('concultamos idmanufacturer');
                    console.log(idManufacturer);


                    var idCategory = 16 // base novus

                    //obtenemos la categoriaNueva, le pasamos la que trae y vemos con cual la tenemos enlazada
                    var holaMundo = await getCategoriaTvc(newP.category_id, newP.category, '')

                    if (holaMundo.level > 0) {
                        idCategory = holaMundo.prestaId
                    }

                    // termina de obtener categoria

                    var supplier = 1 // TVC
                    var idLastNewProduct = await insertProduct(newP, idManufacturer, idCategory, supplier, moment().format('YYYY-MM-DD HH:mm:ss'), getPrice)

                    if (idLastNewProduct.mensaje == 'ok') {
                        if (idLastNewProduct.data != 0) {
                            await insertCategoryProduct(idLastNewProduct.data, 15);
                            await insertProductLang(idLastNewProduct.data, newP)
                            await insertProductShop(idLastNewProduct.data, newP, idCategory, moment().format('YYYY-MM-DD HH:mm:ss'), getPrice)
                            await insertProductSupplier(idLastNewProduct.data, supplier, getPrice)
                            await insertStock(idLastNewProduct.data, getStock)
                            var lastCategoryId = await globalFunc.getLastCategoryId()

                            var last_feature_value_id = await globalFunc.insertFeatureValueCustom(1) // modelo
                            if (last_feature_value_id.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_id.data, newP.provider_model, id_lang)
                                await globalFunc.insertFeatureProduct(1, idLastNewProduct.data, last_feature_value_id.data)
                            }

                            var last_feature_value_id3 = await globalFunc.insertFeatureValueCustom(3) // peso
                            if (last_feature_value_id3.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_id3.data, newP.provider_model, id_lang)
                                await globalFunc.insertFeatureProduct(3, idLastNewProduct.data, last_feature_value_id3.data)
                            }

                            var last_feature_value_idCustom = await globalFunc.insertFeatureValueCustom(63) // stock
                            if (last_feature_value_idCustom.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_idCustom.data, getStock, id_lang)
                                await globalFunc.insertFeatureProduct(63, idLastNewProduct.data, last_feature_value_idCustom.data)
                            }

                            var last_feature_value_idCustom2 = await globalFunc.insertFeatureValueCustom(387) // referencia  
                            if (last_feature_value_idCustom2.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_idCustom2.data, newP.tvc_id, id_lang)
                                await globalFunc.insertFeatureProduct(387, idLastNewProduct.data, last_feature_value_idCustom2.data)
                            }

                            var last_feature_value_idCustom3 = await globalFunc.insertFeatureValueCustom(388) // Referencia
                            if (last_feature_value_idCustom3.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_idCustom3.data, moment().format('YYYY-MM-DD HH:mm:ss'), id_lang)
                                await globalFunc.insertFeatureProduct(388, idLastNewProduct.data, last_feature_value_idCustom3.data)
                            }

                            if (lastCategoryId.mensaje == 'ok') {
                                await globalFunc.insertCategoryProduct(idCategory, idLastNewProduct.data, lastCategoryId.data)

                                // funcion para insertar imagen
                                // aqui se agrega un for por cada imagen  
                                if (newP.media.gallery) { // comprobamos que tenga imagenes
                                    if (Object.keys(newP.media.gallery).length >= 1) {
                                        var ordenImagenes = 1
                                        console.log('IMG - 1');

                                        try {
                                            var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                            await globalFunc.saveImagesToPath('http://api.tvc.mx' + newP.media.main_image, idImagen, 'tvc')
                                            await globalFunc.insertImageLang(idImagen, newP.tvc_id + 'IMG', id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)

                                            for (image in newP.media.gallery) {
                                                console.log('for: IMG - ' + ordenImagenes);
                                                var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, ordenImagenes, null)
                                                await globalFunc.saveImagesToPath('http://api.tvc.mx' + newP.media.gallery[image], idImagen, 'tvc')
                                                await globalFunc.insertImageLang(idImagen, newP.name + '-' + newP.tvc_id, id_lang)
                                                await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, null)

                                                ordenImagenes++
                                            }
                                        } catch (error) {
                                            console.log('error al guardar imagen ');

                                        }


                                    } else { // solo insertar la imagen de portada
                                        try {
                                            if (newP.media.main_image) {
                                                console.log('IMG - 2');
                                                var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                                await globalFunc.saveImagesToPath('http://api.tvc.mx' + newP.media.main_image, idImagen, 'tvc')
                                                await globalFunc.insertImageLang(idImagen, newP.tvc_id + 'IMG', id_lang)
                                                await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                            } else {
                                                console.log('IMG -  3');
                                                // agregamos imagen default del producto, ya que no tiene imagen portada
                                                var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                                
                                                await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", idImagen, 'tvc')
                                                await globalFunc.insertImageLang(idImagen, 'defaultImg', id_lang)
                                                await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                            }
                                        } catch (error) {

                                        }


                                    }
                                } else {
                                    try {
                                        if (newP.media.main_image) {
                                            console.log('IMG - 4');
                                            var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                            await globalFunc.saveImagesToPath('http://api.tvc.mx' + newP.media.main_image, idImagen, 'tvc')
                                            await globalFunc.insertImageLang(idImagen, newP.tvc_id + 'IMG', id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                        } else {
                                            console.log('IMG - 5');
                                            // agregamos imagen default del producto, ya que no tiene imagen portada
                                            var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                            await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", idImagen, 'tvc')
                                            await globalFunc.insertImageLang(idImagen, 'defaultImg', id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                        }
                                    } catch (error) {

                                    }

                                }

                                //guardamos los datos DETALLES
                                await insertDetalles(newP, idLastNewProduct.data)
                                if (newP.media.documents) {
                                    await insertFiles(newP.media.documents, idLastNewProduct.data)
                                }

                            }
                        }
                    }
                } else {
                    console.log('tiene stock 0 o precio 0');

                }
            } else {
                console.log('no hay producto' + productosParaAgregar[prod3].clave);
            }
        }

    }

    console.log('Actualizacion terminada ###########################');
    console.log('Hora inicio: ' + horaInicio);
    console.log('Hora Termino: ' + moment().format('DD-MM-YYYY HH:mm:ss'));
    globalFunc.insertRegistro('UpdateTvc2 Fecha inicio '+ horaInicio)


}

const task = new Task('simple task' , () => {
    asyncCall() 
    //globalFunc.insertRegistro('UpdateTvc2')
  })
const job = new SimpleIntervalJob({ minutes: 120, }, task)
scheduler.addSimpleIntervalJob(job)

// asyncCall()