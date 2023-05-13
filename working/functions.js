
const _ = require('lodash')
const db = require('./db')
const moment = require('moment')
const fsPath = require('fs-path')
const fetch = require('node-fetch');
const sharp = require('sharp');

const images = [{ name: '', size: 400 },
{ name: '-cart_default', size: 90 },
{ name: '-home_default', size: 278 },
{ name: '-large_default', size: 800 },
{ name: '-medium_default', size: 455 },
{ name: 'mini', size: 45 },
{ name: '-small_default', size: 90 }]

module.exports = {
    cleanName: function (nombre) {
        var nameLowCase = nombre.toLowerCase();
        var nameNoSpecial = nameLowCase.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        var nameNoSpecial2 = nameNoSpecial.replace(/ñ/gi, 'n');
        return (nameNoSpecial2.replace(/í/gi, 'i'))
    },
    cleanJustName: function (nombre) {
        var replaced = nombre.replace(/[`~!@#$%^&*_|+\-=?;:'",\{\}\[\]]/gi, '');
        var replaced2 = replaced.replace(/ñ/gi, 'n');
        return(replaced2.replace(/í/gi, 'i'));
    },
    getIdBrand: function (brand) {
        
        return new Promise(resolve => {

            db.getConnection((err, conn) => {
                // obtenemos todos los productos de tecnosinergia
                conn.query("SELECT * FROM ps_manufacturer WHERE NAME = '" + brand + "' LIMIT 1", function (err, result) {
                    if (err) resolve(0);

                    console.log('lo que llega de revisar manufacturer')                    
                    console.log(result);
                    
                    if(result[0]){
                        if (result[0].id_manufacturer) {
                            resolve(result[0].id_manufacturer)
                        } else {
                            resolve(0)
                        }
                    }else{
                        resolve(0)
                    }
                    

                    conn.release();
                });
            })
        });
    },
    productHasDetails: function (productId) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                // obtenemos todos los productos de tecnosinergia
                conn.query("SELECT * FROM ps_producto_detalles WHERE product_id = " + productId, function (err, result) {
                    if (err) resolve('');
                    resolve(result)
                    conn.release();
                });
            })
        });
    },
    productHasFeature: function (featureId, productId) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                // obtenemos todos los productos de tecnosinergia
                conn.query("SELECT * FROM ps_feature_product WHERE id_feature = "+featureId+" AND id_product = " + productId, function (err, result) {
                    if (err) resolve('');
                    resolve(result)
                    conn.release();
                });
            })
        });
    },
    getLastCategoryId: function () {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('SELECT position FROM ps_category_product ORDER BY position DESC LIMIT 1', function (error, result) {
                    if (err) console.log(err);
                    if (error) console.log(error);
                    var lastItem = ''

                    Object.keys(result).forEach(function (key) {
                        var row = result[key];
                        console.log('position foreach');
                        console.log(row.position)
                        lastItem = row.position
                    });

                    resolve({ mensaje: 'ok', data: lastItem })
                    conn.release();
                });
            })
        })
    },
    insertImageLang: function (idImage, name, id_lang) {
        return new Promise(resolve => {
            var cleanNameString = this.cleanName(name)
            var shortName = cleanNameString.substring(0, 127);
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_image_lang(id_image, id_lang, legend) VALUES (?,?,?)', [idImage, id_lang, shortName], function (error, result) {
                    if (err) console.log(err);
                    if (error) console.log(error);
                    resolve('ok')
                    conn.release();
                });
            })
        })
    },
    getNotUpdated: function (supplierId) {
        return new Promise(resolve => {
            console.log("SELECT * from ps_product WHERE id_supplier = " + supplierId + " AND  date_upd < '" + moment().format('YYYY-MM-DD') + "' ");

            db.getConnection((err, conn) => {
                // obtenemos todos los productos de tecnosinergia
                conn.query("SELECT * from ps_product WHERE id_supplier = " + supplierId + " AND  date_upd < '" + moment().format('YYYY-MM-DD') + "' ",
                    function (err, result) {
                        if (err) resolve({ mensaje: 'error, no data DB', data: {} });

                        let oldProduct = []
                        _.forEach(result, function (value) {
                            // llenamos para tener una lista de los produ
                            oldProduct.push({ code: value.reference, id_product: value.id_product })

                        });

                        resolve(oldProduct)
                        conn.release();
                    });
            })
        });
    },
    updateProductDate: function (producto) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('UPDATE ps_product SET date_upd = ? WHERE id_product = ?',
                    [moment().format('YYYY-MM-DD HH:mm:ss'), producto],
                    function (error, result) {
                        //console.log(result);
                        if (error) {
                            //console.log(error);
                            console.log('update date : #' + producto + ' - FAIL');
                            console.log(error);
                            resolve('update date : #' + producto + ' - FAIL');
                        } else {
                            console.log('update date : #' + producto + ' - DONE');
                            resolve('update date List : #' + producto + ' - DONE');
                        }
                        conn.release();
                    });
            })
        })
    },
    insertCategoryProduct: function (category, idProduct, position) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_category_product(id_category, id_product, position) VALUES (?,?,?)', [category, idProduct, position], function (error, result) {
                    if (err) console.log(err);
                    if (error) console.log(error);

                    console.log('okey, insertCategoryProduct');

                    resolve('ok')
                    conn.release();
                });
            })
        })
    },
    insertPsImage: function (idProduct, countPosition, some) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_image(id_product,position,cover) VALUES (?,?,?)', [idProduct, countPosition, some], function (error, result) {
                    if (err) console.log(err);
                    if (error) console.log(error);
                    resolve(result.insertId)
                    conn.release();
                });
            })
        })
    },
    insertImageShop: function (idProduct, idImage, cover) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_image_shop(id_product, id_image, id_shop, cover) VALUES (?,?,?,?)', [idProduct, idImage, 1, cover], function (error, result) {
                    if (err) console.log(err);
                    if (error) console.log(error);
                    console.log('despues de insertImageShop');
                    console.log(result)

                    resolve('ok')
                    conn.release();
                });
            })
        })
    },
    updateProductoPrice: function (producto, price) { 
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('UPDATE ps_product_shop SET price = ' + price + ' WHERE id_product = ' + producto,
                    function (error, result) {
                        //console.log(result);
                        if (error) {
                            //console.log(error);
                            console.log('update Product Stock List : #' + producto + ' - FAIL');
                            console.log(error);
                            resolve('update Product Stock List : #' + producto + ' - FAIL');
                        } else {
                            console.log('update Product Stock List : #' + producto + ' - DONE');
                            resolve('update Product Stock List : #' + producto + ' - DONE');
                        }
                        conn.release();
                    });
            })
        })
    },
    updateStockFeature: function (producto, stock) {
        return new Promise(resolve => {
            console.log('UPDATE ps_feature_value_lang SET value = ' + stock + ' WHERE id_feature_value = ' + producto);
            
            db.getConnection((err, conn) => {
                conn.query('UPDATE ps_feature_value_lang SET value = ' + stock + ' WHERE id_feature_value = ' + producto,
                    function (error, result) {
                        if (error) {
                            console.log('update Product feature stock List : #' + producto + ' - FAIL');
                            console.log(error);
                            resolve('update Product feature stock List : #' + producto + ' - FAIL');
                        } else {
                            console.log('update Product feaature stock : #' + producto + ' - DONE');
                            resolve('update Product feature stock  : #' + producto + ' - DONE');
                        }
                        conn.release();
                    });
            })

        })
    },
    updateProductoStock: function (producto, stock) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('UPDATE ps_stock_available SET quantity = ' + stock + ', physical_quantity = ' + stock + ' WHERE id_product = ' + producto,
                    function (error, result) {
                        
                        //console.log(result);
                        if (error) {
                            //console.log(error);
                            
                            console.log('update Product Price List : #' + producto + ' - FAIL');
                            console.log(error);
                            resolve('update Product Price List : #' + producto + ' - FAIL');
                        } else {
                            console.log('update Product Price List : #' + producto + ' - DONE');
                            resolve('update Product Price List : #' + producto + ' - DONE');
                        }
                        conn.release();
                    });
            })

        })
    },
    setActive: function (producto, active) {
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('UPDATE ps_product_shop SET active = ' + active + ' WHERE id_product = ' + producto,
                    function (error, result) {
                        //console.log(result);
                        if (error) {
                            //console.log(error);
                            console.log('update Active ' + active + ' List : #' + producto + ' - FAIL');
                            console.log(error);
                            resolve('update Active ' + active + ' List : #' + producto + ' - FAIL');
                        } else {
                            console.log('update Active ' + active + ' List : #' + producto + ' - DONE');
                            resolve('update Active ' + active + ' List : #' + producto + ' - DONE');
                        }
                        conn.release();
                    });
            })
        })
    },
    insertFeatureValue: function () {
        console.log('funcion insertFeatureValue: - INSERT INTO ps_feature_value(id_feature, custom) VALUES (3, 0)')
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_feature_value(id_feature, custom) VALUES (3, 0)',
                    function (error, result) {
                        if (error) {
                            resolve('fail')
                        } else {
                            console.log('result inserted feature value')
                            console.log(result.insertId);

                            resolve({ mensaje: 'ok', data: result.insertId })
                        }
                        conn.release();
                    });
            })
        })
    },
    insertFeatureValueCustom: function (featureId) {
        console.log('funcion insertFeatureValue: - INSERT INTO ps_feature_value(id_feature, custom) VALUES ('+featureId+', 0)')
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_feature_value(id_feature, custom) VALUES ('+featureId+', 0)',
                    function (error, result) {
                        if (error) {
                            resolve('fail')
                        } else {
                            console.log('result inserted value custom')
                            console.log(result.insertId);

                            resolve({ mensaje: 'ok', data: result.insertId })
                        }
                        conn.release();
                    });
            })
        })
    },
    insertFeatureValueLang: function (featureValueID, Model, id_lang) {
        console.log('insertFeatureValueLang: - INSERT INTO ps_feature_value_lang(id_feature_value, id_lang , value)#' + featureValueID + ' # ' + id_lang + '#' + Model)
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_feature_value_lang(id_feature_value, id_lang , value) VALUES (?, ?, ?)',
                    [featureValueID, id_lang, Model],
                    function (error, result) {
                        if (error) { 
                            resolve('fail')
                        } else {
                            console.log('result inserted valuelang')
                            console.log(result.insertId);

                            resolve('ok')
                        }
                        conn.release();
                    });
            })
        })
    },
    insertFeatureProduct: function (idFeature, idProduct, idFeatureValue) {
        console.log('funcion : - insertFeatureProduct' + idFeature + '#' + idProduct + '#' + idFeatureValue)
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                conn.query('INSERT INTO ps_feature_product(id_feature, id_product, id_feature_value) VALUES (?,?,?)',
                    [idFeature, idProduct, idFeatureValue],
                    function (error, result) {
                        if (error) {
                            resolve('fail')
                        } else {
                            console.log('result inserted featureproduct')
                            console.log(result.insertId);
 
                            resolve('ok')
                        }
                        conn.release();
                    });
            })
        })
    },
    saveImagesToPath: async function (url, code, folder) {

        if (url != '') {
            const response = await fetch(url);
            const buffer = await response.buffer();

            var sNumber = code.toString();
            var codePath = ''
            for (var i = 0, len = sNumber.length; i < len; i += 1) {
                codePath += '/' + sNumber.charAt(i)
            }

            var path = './' + folder + codePath + '/' + code + '.jpg'

            fsPath.writeFile(path, buffer, function (err) {
                if (err) {
                    throw err;
                } else {
                    images.forEach(element => {
                        if (element.name == 'mini') {
                            sharp(buffer)
                                .flatten({ background: { r: 255, g: 255, b: 255 } })
                                .resize({ height: element.size, width: element.size })
                                .toFile('./' + folder + '/productMini/' + 'product_mini_' + code + '.jpg')
                                .then(function (newFileInfo) {
                                    //console.log("Image Resized" + code + element.name + element.size);
                                })
                                .catch(function (err) {
                                    console.log("Got Error" + code + element.name + element.size);
                                    console.log(path)
                                    console.log(err);
                                });
                        } else {
                            sharp(buffer)
                                .flatten({ background: { r: 255, g: 255, b: 255 } })
                                .resize({ height: element.size, width: element.size })
                                .toFile('./' + folder + '' + codePath + '/' + code + element.name + '.jpg')
                                .then(function (newFileInfo) {
                                    //console.log("Image Resized" + code + element.name + element.size);
                                })
                                .catch(function (err) {
                                    console.log("Got Error" + code + element.name + element.size);
                                    console.log(path)
                                    console.log(err);
                                });
                        }
                    });
                }
            });

        } else {
            console.log('no existe URL, es vacio');
        }
    },
    obtenerPorcentajeSupplier: function(supplier) {
        console.log('obtenerPorcentajeSupplier: ' + supplier);
        
        return new Promise(resolve => {
            db.getConnection((err, conn) => {
                if(err) resolve(0)
                // obtenemos todos los productos de ct = 3
                conn.query("SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = " + supplier, function (err2, result) {
                    if (err2) {
                        resolve(0);
                    } else {
                        if (result.length > 0){
                            console.log('llega resultado de la funcion getNuevoPrecioPorPorcentaje');
                            console.log(result[0].porcentaje);
                            
                            resolve(result[0].porcentaje)
                        } else{
                            resolve(0)
                        }
                        
                    }
                    conn.release();
                });
            })
        });
    },
    insertRegistro: function(supplier){

        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_registro_cron(nombre, descripcion ,fecha, accion, origen ) VALUES (?,?,?,?,?)', [supplier, 'Se ejecuta el CRON', moment().format('YYYY-MM-DD HH:mm:ss'), 'Actualizado', 'EC2'], function (error, result) {
                if (err) console.log(err);
                if (error) console.log(error);
                
                conn.release();
            });
        })

    }
}
