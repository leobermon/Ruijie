const axios = require('axios').default;
const _ = require('lodash')
const db = require('./db')
const moment = require('moment-timezone');
var globalFunc = require('./functions')
const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler');

// ######### Variables Globales
const id_lang = 2 //definimos el idioma espanol
const id_tax = 53 //tax de mexico
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0
const scheduler = new ToadScheduler()
let jsonCompletoOrigen = []
let tipoCambio = 0

axios.defaults.headers.common['Authorization'] = "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjRlZWIzYzNjMTcwNzQ3ZjRiOWNmODFjYThhNzRkOTEyNWMwOTBiMDZmYmZkNjllZWQyNjRhNDM2NDNhNWMxMDVjMWJiNDQ0NmM4NGFkYWNiIn0.eyJhdWQiOiJBQzljVWtiVnRwaW5GUmdDRzFCUUpuR043QkJkVTZEbiIsImp0aSI6IjRlZWIzYzNjMTcwNzQ3ZjRiOWNmODFjYThhNzRkOTEyNWMwOTBiMDZmYmZkNjllZWQyNjRhNDM2NDNhNWMxMDVjMWJiNDQ0NmM4NGFkYWNiIiwiaWF0IjoxNjgyNTM0MjU5LCJuYmYiOjE2ODI1MzQyNTksImV4cCI6MTcxNDA3MDI1OSwic3ViIjoiIiwic2NvcGVzIjpbXX0.KFVHmpVW8nHucY5vhG7-pgdPN7KJfpYkKYv8btb41wZN7MUba-M-mnJKraFBIO5krxr8U15agIUy_2gvqCPCrhMTnsbw250oKkEIzq_uSbnRdYOXT8meTC8tTuXup1TaQha-7_6lkM0p4CheFjb9up9C0VdsRErhQMLboh5wZuEdzDK1TG6BFtQbPqGlvaUsL0qHxEghe-1aYrMC87FEpuzyczpWFA-eTZZE8Fozjbe6flA5OWhXPd0pjcOXVM3pNQT8dmlKZ1ocFMjVN6qJUipX3tD9-Hu5ALpZnB_13L5LKjNsj-7VGpRokluN2ls--fGBK1oGeN1t-T-yyPaRJJc6JAddqCs3UF7knnyhee_9YWz6IC3I10babVQ2w3M7R3NzgHwqs9omAAdwLnihlYREBeIQUHkulRAxwamJr28e24f9xl2SWijgygCmFWYChu09AOLS_eg6LRi6GOIMsXVNwI8xI2yxZXWyE5dVMrZ94vTsOrRR0hMmMaGZ84PzJnQfzfzQ7_R5wNFjhs8fGRUQSGC0bnpDDqDYbl6HF5sTbXhS1zJoVWN75vOMbXjZiBn_Mv4cwio_vSe2A1ozR2qgGWNYclInecnPrIx-PCbGnkE4gQFUD-0-8bUBixk7lxZQEX5eRcEiW7WzXm5J1RY58hb88m_eT-07qDgmvyo";

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
            conn.query("SELECT id_product,id_syscom FROM ps_product WHERE id_supplier = 4 AND id_syscom NOT IN (SELECT clave FROM ps_productos_syscom)",
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
            conn.query('UPDATE ps_productos_syscom AS dest,(SELECT id_product, id_syscom, id_category_default FROM ps_product WHERE id_supplier = 4) AS src SET dest.id_product = src.id_product, dest.id_category = src.id_category_default WHERE dest.clave = src.id_syscom',
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
        let stringLowerCase = cleanJustName.toLocaleLowerCase();
        let stringUpperCase = stringLowerCase
            .split(/ /g).map(word =>
                `${word.substring(0, 1).toUpperCase()}${word.substring(1)}`)
            .join(" ");
        // limpiar descripcion de emojis
        var descripcionNueva2 = p.descripcion.replace(/  /g, ' ')
        var descripcionNueva3 = descripcionNueva2.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        var descripcionNueva4 = descripcionNueva3.replace(/ñ/gi, 'n');
        var descripcionNueva5 = descripcionNueva4.replace(/í/gi, 'i')

        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_lang(id_product, id_shop, id_lang, description, description_short, link_rewrite, meta_description, meta_keywords, meta_title, name) VALUES (?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, id_lang, descripcionNueva5, ' ', nameInLinkFormat, '', '', '', stringUpperCase], function (error, result) {
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
                resolve(error)
            });
    })
}

function waitSevenSeconds() {
    return new Promise(resolve => {
        console.log('##@@ esperamos 7 segundos para conmtinuar: ' + moment().format('HH:mm:ss'));

        setTimeout(function () { // esperamos 7 segundos para no sobrepasar las consultas permitidas
            console.log('##@@ termina de esperar los 7 segundos : ' + moment().format('HH:mm:ss'));
            resolve(true);
        }, 7000);
    });
}

function getSyscom(pagina) {
    return new Promise(resolve => {
        axios.get('https://developers.syscom.mx/api/v1/marcas/ruijie/productos?pagina=' + pagina)
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

                        resolve({ mensaje: 'ok', data: nuevoJson, totalPaginas: response.data.paginas })

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

function insertCategoryProduct(id_product, id_category) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_category_product(id_category, id_product, position) VALUES (' + id_category + ', ' + id_product + ', 0)', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });

                console.log(error);
                console.log('despues de insert category product');
                resolve({ mensaje: 'ok', data: result.insertId })
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
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product(id_supplier,id_manufacturer,id_category_default,id_tax_rules_group,supplier_reference,reference,mpn,cache_default_attribute,date_add,date_upd,price,unity,redirect_type, available_date,active,id_syscom) VALUES (' + supplier + ', ' + bandId + ', ' + category + ', ' + id_tax + ', "' + p.producto_id + '","' + p.modelo + '","' + p.modelo + '", 0, "' + date + '", "' + date + '", ' + getPrice + ', "", "301-category", "0000-00-00", 1,' + p.producto_id + ')', function (error, result) {
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

function actualizarPorcentajesPorCategoria() {

    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('UPDATE ps_productos_syscom SET porcentaje = (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 4) WHERE  id_category IS NOT NULL', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria');
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    })

}

function actualizarPrecioPorPorcentaje() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('UPDATE ps_productos_syscom SET precioMasPorcentaje = CASE WHEN precioFinal < 300 THEN (precioFinal) + (precioFinal* (SELECT porcentaje FROM ps_supplier_percentage WHERE id = 6 ) / 100.0) WHEN precioFinal > 300 AND precioPromocion > 0 THEN (precioPromocion) + ((precioPromocion) * porcentaje / 100.0) WHEN precioFinal > 300 AND precioFinal > 0 THEN (precioFinal) + ((precioFinal) * porcentaje / 100.0) WHEN porcentaje = 0 THEN precioFinal ELSE precioFinal END WHERE  id_product > 0 ', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria');
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    })
}


async function asyncCall() {
    console.log('Ejecutando Actualizacion SYSCOM 2 ')
    let horaInicio = moment().format('DD-MM-YYYY HH:mm:ss')
    await deleteTemporalProducts()
    let obtuvimosTipoCambio = (await getTipoCambioMXN() == 'ok') ? true : false


    if (obtuvimosTipoCambio) { // solo si obtenemos el tipo de cambioo 
        var countProducts2 = 1

        //aqui recorrremos todas la s categorias 
        // termiamos de recorrer todas las categorias
        // ######### recorremos cada categoria de syscom para llenar 

        //----------------------------------------------------------------------------------
        //==================================================================================
        //consultamos cuantas paginas hay para los productos

        await waitSevenSeconds()

        const contarPaginas = await getSyscom(1)
        const totalPaginas = contarPaginas.totalPaginas

        for (let W = 1; W <= totalPaginas; W++) {
            console.log('dentro del for = ' + W);

            await waitSevenSeconds();
            var validator = await getSyscom(W) // datos del json
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
        console.log('porcentajeAumentoSupplier del proveedor');
        console.log(porcentajeAumentoSupplier);

        porcentajeAumentoSupplier2 = await globalFunc.obtenerPorcentajeSupplier(99)
        console.log('porcentajeAumentoSupplier2 para los productos menos de 300');
        console.log(porcentajeAumentoSupplier2);

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

                console.log(await updateStockPrice(listaToUpdate))
                listaToUpdate = ''
                countProductsUpdate = 0
            }
        } else {
            //console.log('no tiene numero de roducto: ' + temporal[key]);
        }
        countProductsUpdate++
    }

    await updateStockPrice(listaToUpdate)

    //////===========================================================================
    //==========================AGREGAMOS PRODUCTOS =================================
    //==============================================================================

    const listapJson = await obtenerProductosTemporalesSyscomAdd()
    for (prod3 in listapJson) {

        var newPInsert = await getSyscomProductById(listapJson[prod3].idProduct)
        if (newPInsert.mensaje == 'ok') {


            if (getPrecioMxn(newPInsert.data.precios) > 0) {
                var nuevoStock = getExistencia(newPInsert.data.existencia)

                var nuevoPrecio2 = getPrecioMxn(newPInsert.data.precios)

                if (porcentajeAumentoSupplier > 0) {
                    var nuevoPrecio = (nuevoPrecio2 > 300) ? nuevoPrecio2 +
                        (nuevoPrecio2 * porcentajeAumentoSupplier / 100) : nuevoPrecio2 +
                    (nuevoPrecio2 * porcentajeAumentoSupplier2 / 100)
                } else {
                    var nuevoPrecio = nuevoPrecio2
                }

                var idManufacturer = 3 //id_manufacturer ruijie
                let manufacturer = true

                var idCategory = 2 // base test ruijie

                var supplier = 4 // supplier  syscom

                //if (productoComplete.mensaje == 'ok') {
                saveMiniPicture = true // controlador para guardar MiniImagen una sola vez 

                var idLastNewProduct = await insertProduct(newPInsert.data, idManufacturer, idCategory, supplier, moment().format('YYYY-MM-DD HH:mm:ss'), nuevoPrecio)
                if (idLastNewProduct.mensaje == 'ok' && manufacturer) {
                    if (idLastNewProduct.data != 0) {
                        await insertCategoryProduct(idLastNewProduct.data, 2); //pasamos categoria inicio '2'
                        await insertProductLang(idLastNewProduct.data, newPInsert.data)
                        await insertProductShop(idLastNewProduct.data, newPInsert.data, idCategory, moment().format('YYYY-MM-DD HH:mm:ss'), nuevoPrecio)
                        await insertProductSupplier(idLastNewProduct.data, supplier, getPrecioMxn(newPInsert.data.precios), nuevoPrecio)
                        await insertStock(idLastNewProduct.data, newPInsert.data, nuevoStock)
                        var lastCategoryId = await globalFunc.getLastCategoryId()

                        if (lastCategoryId.mensaje == 'ok') {
                            await insertCategoryProduct(idCategory, idLastNewProduct.data, lastCategoryId.data)

                            //agregarFotos
                            // hacer un foreach de las fotos si hay mas de una foto
                            if (Object.keys(newPInsert.data.imagenes).length > 1) {
                                var ordenImagenes = 1
                                try {
                                    for (image in newPInsert.data.imagenes) {
                                        var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, ordenImagenes, (ordenImagenes == 1) ? 1 : null)
                                        await globalFunc.saveImagesToPath(newPInsert.data.imagenes[image].imagen, idImagen, 'syscom')
                                        await globalFunc.insertImageLang(idImagen, newPInsert.data.titulo + '-' + newPInsert.data.producto_id, id_lang)
                                        await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, (ordenImagenes == 1) ? 1 : null)
                                        ordenImagenes++

                                    }
                                } catch (error) {
                                    console.log('error agregando imagenes #############');

                                }

                            } else { // solo insertar la imagen de portada
                                if (newPInsert.data.img_portada != '') {
                                    try {
                                        var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                        await globalFunc.saveImagesToPath(newPInsert.data.img_portada, idImagen, 'syscom')
                                        await globalFunc.insertImageLang(idImagen, newPInsert.data.titulo, id_lang)
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
                                await globalFunc.insertFeatureValueLang(hasModelo.data, newPInsert.data.modelo, id_lang)
                                await globalFunc.insertFeatureProduct(1, idLastNewProduct.data, hasModelo.data)
                            }

                            var hasPeso = await globalFunc.insertFeatureValueCustom(3) // peso
                            if (hasPeso.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(hasPeso.data, newPInsert.data.modelo, id_lang)
                                await globalFunc.insertFeatureProduct(3, idLastNewProduct.data, hasPeso.data)
                            }

                            var hasStock = await globalFunc.insertFeatureValueCustom(63) // stock
                            if (hasStock.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(hasStock.data, nuevoStock, id_lang)
                                await globalFunc.insertFeatureProduct(63, idLastNewProduct.data, hasStock.data)
                            }

                            var hasReference = await globalFunc.insertFeatureValueCustom(387) // referencia
                            if (hasReference.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(hasReference.data, newPInsert.data.producto_id, id_lang)
                                await globalFunc.insertFeatureProduct(387, idLastNewProduct.data, hasReference.data)
                            }

                            var last_feature_value_idCustom3 = await globalFunc.insertFeatureValueCustom(388) // Referencia
                            if (last_feature_value_idCustom3.mensaje == 'ok') {
                                await globalFunc.insertFeatureValueLang(last_feature_value_idCustom3.data, moment().format('YYYY-MM-DD HH:mm:ss'), id_lang)
                                await globalFunc.insertFeatureProduct(388, idLastNewProduct.data, last_feature_value_idCustom3.data)
                            }

                            await insertDetalles(newPInsert.data, idLastNewProduct.data)
                            await insertFiles(newPInsert.data.recursos, idLastNewProduct.data)
                        }
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

    //================================================================================
    //==========================TERMINA DE AGREGAR PRODUCTOS ========================
    //================================================================================

    console.log('Actualizacion terminada ###########################');
    console.log('Hora inicio: ' + horaInicio);
    console.log('Hora Termino: ' + moment().format('DD-MM-YYYY HH:mm:ss'));
    globalFunc.insertRegistro('UpdateSyscom2 Fecha inicio ' + horaInicio)

}

const task = new Task('simple task', () => {
    asyncCall()
    globalFunc.insertRegistro('UpdateRuijie')
})

const job = new SimpleIntervalJob({ minutes: 60, }, task)
scheduler.addSimpleIntervalJob(job)
