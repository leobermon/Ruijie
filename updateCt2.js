const _ = require('lodash');
const db = require('./db');
const moment = require('moment-timezone');
var schedule = require('node-schedule');
var globalFunc = require('./functions');
var fs = require('fs');
var Client = require('ftp');
const id_lang = 2;
const id_tax = 53;
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0 
var porcentajeSupplier = 0;
const categoriasComputo = [1722,1750,2917,2921,2924,2926,2927];

// ciudad juarez = CJS // mexicali = MXL // Tijuana = TIJ // Ensenada = ENS // La paz - PAZ // Tapachula = TAP
const ciudadesNoAdmitidas = ["CJS", "MXL", "TIJ", "ENS", "PAZ", "TAP"]
let jsonCompletoOrigen = []

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler')
const scheduler = new ToadScheduler()

function insertProductosCtTemporal(p) {
    var sql = "INSERT INTO ps_productos_ct(idProduct, clave, nombre, modelo, activo, existencia, precio, moneda, tipoCambio, precioFinal,action, id_product, precioPromocion) VALUES ?"
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, [p], function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                resolve({ mensaje: 'ok', data: result })
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

function getPrecioMxn(precio, moneda, tipoCambio) {
    if (moneda == "MXN") {
        return (precio)
    } else {
        var multiplicacion = precio * tipoCambio
        var roundedPrice = _.round(multiplicacion, 4)
        return (roundedPrice)
    }
}


function getPrecioPromocion(promo) {
    if (promo.promociones && promo.promociones.length > 0) {
        if (promo.moneda == 'MXN') {
            var nuevoPrecioPromo = promo.promociones[0].promocion
            var currentPrice = promo.precio
        } else { //cuando sea en usd
            var nuevoPrecioPromo = getPrecioMxn(promo.promociones[0].promocion, promo.moneda, promo.tipoCambio)
            var currentPrice = getPrecioMxn(promo.precio, promo.moneda, promo.tipoCambio)
        }

        switch (promo.promociones[0].tipo) {
            case 'porcentaje':
                //reducimos el porcentaje al precio MXN de este producto
                var newPorcentaje = 100 - promo.promociones[0].promocion
                var newPrice = (currentPrice / 100) * newPorcentaje
                return (newPrice)
                break;
            case 'importe':
                //reducimos la cantidad al precio MXN de este producto
                return (nuevoPrecioPromo)
                break;
            default:
                return (0)
                break;
        }
    } else {
        return (0)
    }
}

function getExistencia(existencia) {
    if (Object.keys(existencia).length > 0) {
        var exist = 0
        _.forEach(existencia, function (value, key) {
            if (!ciudadesNoAdmitidas.includes(key)) {
                exist = exist + value
            }
        });
        return (exist)
    } else {
        return (0)
    }
    //obtenemos el tipo de cambio en mxn y convertimos
}

function downloadExcel() {
    return new Promise(resolve => {
        var c = new Client();
        c.on('ready', function () {
            c.get('catalogo_xml/productos.json', function (err, stream) {
                if (err) {
                    resolve({ mensaje: 'fail', data: {} })
                } else {
                    stream.once('close', function () { c.end(); });
                    stream.pipe(fs.createWriteStream('ct/productosCt.json'));
                    stream.pipe(fs.createWriteStream('ct/json/File-' + moment().format('DD-MM-YYYY_HH-mm-ss') + '.json'));

                    //devolver respuesta despues de 3 segundo, asi le daoms tiempo a que se cree el archivo
                    setTimeout(function () {
                        resolve({ mensaje: 'ok', data: {} })
                    }, 10000);
                }
            });
        });

        // connect to localhost:21 as anonymous
        c.connect({
            host: "216.70.82.104",
            port: 21,
            user: "CUN0841",
            password: "4HqSy7lnTne28D1DjMaK"
        });
    })
}

function getJsonFile() {
    return new Promise(resolve => {
        try {
            let rawdata = fs.readFileSync('ct/productosCt.json');
            jsonCompletoOrigen = JSON.parse(rawdata);
            let productos = JSON.parse(rawdata);
            var nuevoJson = []

            for (producto in productos) {
                // llenamos para tener la lista de los prods del json
                nuevoJson.push({
                    idProduct: productos[producto].idProducto,
                    clave: productos[producto].clave,
                    nombre: productos[producto].nombre,
                    modelo: (productos[producto].modelo.length <= 22) ? productos[producto].modelo : productos[producto].clave,
                    activo: productos[producto].activo,
                    existencia: getExistencia(productos[producto].existencia),
                    precio: productos[producto].precio,
                    moneda: productos[producto].moneda,
                    tipoCambio: productos[producto].tipoCambio,
                    precioFinal: getPrecioMxn(productos[producto].precio, productos[producto].moneda, productos[producto].tipoCambio),
                    precioPromocion: getPrecioPromocion(productos[producto])
                })
            }

            resolve({ mensaje: 'ok', data: nuevoJson })
        } catch (error) {
            resolve({ mensaje: 'fail', data: error })
        }

    });
}


function obtenerProductosTemporalesCtAdd() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            conn.query("SELECT * FROM ps_productos_ct WHERE id_product = 0 AND existencia > 0", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) resolve(result)
                    resolve(false)
                }
                conn.release();
            });
        })
    });
}

function getCategoriaCt(idSubCategoria, subcategoria, idCategoria, categoria) {
    return new Promise(resolve => {
        console.log("SELECT * FROM ps_categoriaCt WHERE idCategoria = '" + idCategoria + "' AND idSubcategoria = '" + idSubCategoria + "' ");

        db.getConnection((err, conn) => {
            conn.query("SELECT * FROM ps_categoriaCt WHERE idCategoria = '" + idCategoria + "' AND idSubcategoria = '" + idSubCategoria + "' ",
                function (error, result) {
                    if (error) {
                        resolve(error);
                    } else {
                        if (result[0]) {
                            if (result[0].prestaId) resolve({ level: 1, prestaId: result[0].prestaId })
                            resolve({ level: 0, id: result[0].id })

                        } else {
                            console.log('se mete a insertar categoriaCt_pendiente');
                            console.log([idCategoria, categoria, idSubCategoria, subcategoria]);



                            conn.query('INSERT INTO ps_categoriaCt_pendiente(idCategoria, categoria, idSubcategoria, subcategoria) VALUES (?,?,?,?)',
                                [idCategoria, categoria, idSubCategoria, subcategoria], function (error2, result2) {
                                    if (error2) console.log(error2);
                                    resolve({ level: 0, id: 0 })
                                    conn.release();
                                });
                        }
                        resolve(result);
                    }
                    conn.release();
                });
        })
    })
}

function obtenerProductosTemporalesCtUpdate() {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de ct = 3
            conn.query("SELECT * FROM ps_productos_ct WHERE id_product > 0", function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos');
                        resolve(result)
                    } else {
                        console.log('no hay datos ctupdate ');
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
            conn.query("SELECT id_product,supplier_reference FROM ps_product WHERE id_supplier = 3 AND TRIM(supplier_reference) NOT IN (SELECT TRIM(clave) FROM ps_productos_ct)",
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
            conn.query('UPDATE ps_productos_ct AS dest,(SELECT id_product, supplier_reference, id_category_default FROM ps_product WHERE id_supplier = 3) AS src SET dest.id_product = src.id_product, dest.id_category = src.id_category_default WHERE dest.clave = src.supplier_reference',
                //conn.query('UPDATE ps_productos_ct INNER JOIN ps_product ON TRIM(ps_productos_ct.clave) <=> TRIM(ps_product.reference) SET ps_productos_ct.id_product = IF(ps_product.id_product > 0, ps_product.id_product, 0) WHERE ps_product.id_supplier = 3',
                function (error, result) {
                    if (error) resolve('fail');
                    resolve('done');
                    conn.release();
                });
        })
    })
}

function crearDescripcion(producto) {
    if (producto) {
        if (producto.especificaciones) {
            var espec = producto.especificaciones
            if (espec.length > 0) {

                var mensaje = "<br><br> <table> ";
                _.forEach(espec, function (val) {
                    mensaje += "<tr> <td> " + val.tipo + " </td> <td> &nbsp; &nbsp; &nbsp; &nbsp; </td> <td> " + val.valor + " </td> </tr>"
                })

                mensaje += "</table> <br><br>"
                return (mensaje)

            } else {
                console.log('no hay datos es especificaciones ');
            }
        }
    } else {
        console.log('no existe descripcion');
        return ('')
    }
}

function insertProductLang(idProduct, p) {
    return new Promise(resolve => {
        var cleanJustName = globalFunc.cleanJustName(p.descripcion_corta)
        var cleanNameString = globalFunc.cleanName(p.descripcion_corta)
        var nameNoSpecial4 = cleanNameString.replace(/  /g, ' ')
        var nameNoSpecial6 = nameNoSpecial4.split(' ').join('-')
        var nameInLinkFormat = nameNoSpecial6 + '-' + p.clave
        let modelo = '';
        if(p.modelo != undefined){
            modelo = jsonCompletoOrigen[key]['modelo'];
            if(!cleanJustName.includes(`${modelo}`))
            {
                cleanJustName = cleanJustName + ' ' + modelo
            }
        }
        /*
        let stringLowerCase = cleanJustName.toLocaleLowerCase();
        let stringUpperCase = stringLowerCase
        .split(/ /g).map(word =>
            `${word.substring(0,1).toUpperCase()}${word.substring(1)}`)
        .join(" ");
        */
        // limpiar descripcion de emojis

        var customDescription = p.descripcion_corta + crearDescripcion(p)
        console.log('aqui esta donde se crea la descripcion **');

        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product_lang(id_product, id_shop, id_lang, description, description_short, link_rewrite, meta_description, meta_keywords, meta_title, name) VALUES (?,?,?,?,?,?,?,?,?,?)', [idProduct, 1, id_lang, '<p>' + customDescription + '</p>', ' ', nameInLinkFormat, '', '', '', cleanJustName], function (error, result) {
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

function insertStock(idProduct, p, getStock) {
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
            conn.query('DELETE FROM ps_productos_ct ',
                function (error, result) {
                    if (error) resolve('fail');
                    resolve('done');
                    conn.release();
                });
        })
    })
}


function getFeature(prod, feature) {
    if (prod) {
        var fet = _.find(prod, { 'tipo': feature });
        if (fet) return (fet)
        return ('')
    } else {
        return ('')
    }
}

function insertDetalles(prod, idProduct, getPrice) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            if (err) {
                -
                resolve('inser Detalles: ' + idProduct + ' Fail')
            } else {
                conn.query('INSERT INTO ps_producto_detalles(product_id, referencia, model, nombre, marca, sat_key, descripcion, precio_especial, precio_descuento, precio_lista, alto, largo, ancho, peso, img_portada, link_privado, marca_logo, ups, ean, caracteristicas) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
                    [idProduct, prod.clave, prod.modelo, globalFunc.cleanJustName(prod.nombre), prod.marca, '', prod.descripcion_corta, getPrice, getPrice, getPrice, getFeature(prod, 'Alto'), getFeature(prod, 'Largo'), getFeature(prod, 'Ancho'), getFeature(prod, 'Peso'), '', '', '', prod.upc, prod.ean, ''],
                    function (error, result) {
                        if (error) {
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

function insertFiles(prod, productoId) {
    return new Promise(resolve => {
        var nombreFile = prod.marca + '-' + prod.clave
        db.getConnection((err, conn) => {
            conn.query('INSERT IGNORE INTO ps_producto_files(id_product, nombre, path, mostrar) VALUES (?,?,?,?)', [productoId, nombreFile, prod.data_sheet, 1],
                function (error, result) {
                    if (err) resolve('inser files: ' + prod.code + ' Fail')
                    resolve('files ok')
                    conn.release();
                });
        })
    })
}

function insertProduct(p, bandId, category, supplier, date, getPrice) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('INSERT INTO ps_product(id_supplier,id_manufacturer,id_category_default,id_tax_rules_group,supplier_reference,reference,mpn,cache_default_attribute,date_add,date_upd,price,unity,redirect_type, available_date,active) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',[supplier,bandId,category,id_tax,p.clave,p.modelo,p.modelo, 0,date,date, getPrice, "", "301-category", "0000-00-00", 1], function (error, result) {
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
            conn.query('UPDATE ps_productos_ct SET porcentaje = CASE WHEN id_category IN (1722,1750,2917,2921,2924,2926,2927) THEN (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 0) ELSE (SELECT porcentaje FROM ps_supplier_percentage WHERE supplier_id = 3) END WHERE  id_category IS NOT NULL', function (error, result) {
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
            conn.query('UPDATE ps_productos_ct SET precioMasPorcentaje = CASE WHEN precioFinal < 300 THEN (precioFinal) + (precioFinal* (SELECT porcentaje FROM ps_supplier_percentage WHERE id = 6 ) / 100.0) WHEN precioFinal > 300 AND precioPromocion > 0 THEN (precioPromocion) + ((precioPromocion) * porcentaje / 100.0) WHEN precioFinal > 300 AND precioFinal > 0 THEN (precioFinal) + ((precioFinal) * porcentaje / 100.0) WHEN porcentaje = 0 THEN precioFinal ELSE precioFinal END WHERE  id_product > 0 ', function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('despues del actualizarPorcentajesPorCategoria' );
                resolve({ mensaje: 'ok', data: '' })
                conn.release();
            });
        })
    }) 
}


async function asyncCall() {
    console.log('Ejecutando Actualizacion CT')
    let horaInicio = moment().format('DD-MM-YYYY HH:mm:ss')
    await deleteTemporalProducts()
    //descargamos el json con todos los productos
    var downloaded = await downloadExcel()
    var downloaded = {mensaje: 'ok'}
 

    if (downloaded.mensaje == 'ok') {
        var validator = await getJsonFile() // creamos el arreglo con los datos temporales 
    } else {
        var validator = { mensaje: 'fail' }
    }

    
    console.log('fuera de porcentaje');
    

    if (validator.mensaje == 'ok') {
        var jsonActive = validator.data;
        var countProductsUpdate = 0;
        var countProductsAdd = 0;
        var countProducts = 1;
        var countProducts2 = 1;
        var newArray = [];

        for (key in jsonActive) {
            jsonActive[key].id_product = 0
            jsonActive[key].action = 0
            countProductsUpdate++

            newArray.push([jsonActive[key].idProduct, jsonActive[key].clave, jsonActive[key].nombre, jsonActive[key].modelo, jsonActive[key].activo, jsonActive[key].existencia, jsonActive[key].precio, jsonActive[key].moneda, jsonActive[key].tipoCambio, jsonActive[key].precioFinal, jsonActive[key].action, jsonActive[key].id_product, jsonActive[key].precioPromocion])

            if (countProducts == 500) { //insertamos cada X registros para no saturar la memoria
                if (newArray.length > 0) {
                    await insertProductosCtTemporal(newArray)
                    newArray = []
                    countProducts = 0
                }
            }

            countProducts++
            countProducts2++
        }
        //agregamos al final los datos que quedaron en el array
        if (newArray.length > 0) console.log(await insertProductosCtTemporal(newArray))

        console.log('Termina de llenar los productos');
        console.log('###############################');
        console.log('countProductsAdd: ' + countProductsAdd);
        console.log('countProductsUpdate: ' + countProductsUpdate);

        porcentajeAumentoSupplier = await globalFunc.obtenerPorcentajeSupplier(3)
        console.log('porcentajeAumentoSupplier');
        console.log(porcentajeAumentoSupplier);

        porcentajeAumentoSupplier2 = await globalFunc.obtenerPorcentajeSupplier(99)
        console.log('porcentajeAumentoSupplier2');
        console.log(porcentajeAumentoSupplier2);
        

        await asignProductsIds() //asignamos el id_product a la tabla productos_ct
        await actualizarPorcentajesPorCategoria() // ponemos el porcentajes que le sumaremos a ese producto 
        await actualizarPrecioPorPorcentaje() // ponemos el nuevo precio basandonos en el nuevo porcentaje          
        await updateNotInJson()  //estos son los productos que estan en DB pero no en el json


        
        //actualizamos los stocks y precios 
        // ############################

        var temporal = await obtenerProductosTemporalesCtUpdate()


        var countProductsUpdate = 1
        var listaToUpdate = ''

        for (key in temporal) { 
            //actualizamos solo los que tenemos los id_product
            if (temporal[key].id_product) {

                //si se actualiza
                // if (temporal[key].precioPromocion > 0) { 
                //     listaToUpdate += `UPDATE ps_stock_available, ps_product_shop, ps_product, ps_feature_value_lang SET ps_stock_available.quantity = ${temporal[key].existencia}, ps_stock_available.physical_quantity = ${temporal[key].existencia}, ps_product_shop.price = ${temporal[key].precioPromocion}, ps_product.date_upd = '${moment().format('YYYY-MM-DD HH:mm:ss')}', ps_feature_value_lang.value = ${temporal[key].existencia} WHERE ps_stock_available.id_product = ${temporal[key].id_product} AND ps_product_shop.id_product = ${temporal[key].id_product} AND ps_product.id_product = ${temporal[key].id_product} AND ps_feature_value_lang.id_feature_value = (SELECT id_feature_value FROM ps_feature_product WHERE id_feature = 63 AND id_product = ${temporal[key].id_product}) ; `;
                // } else {

                    listaToUpdate += `UPDATE ps_stock_available, ps_product_shop, ps_product, ps_feature_value_lang SET ps_stock_available.quantity = ${temporal[key].existencia}, ps_stock_available.physical_quantity = ${temporal[key].existencia}, ps_product_shop.price = ${temporal[key].precioMasPorcentaje}, ps_product.date_upd = '${moment().format('YYYY-MM-DD HH:mm:ss')}', ps_feature_value_lang.value = ${temporal[key].existencia} WHERE ps_stock_available.id_product = ${temporal[key].id_product} AND ps_product_shop.id_product = ${temporal[key].id_product} AND ps_product.id_product = ${temporal[key].id_product} AND ps_feature_value_lang.id_feature_value = (SELECT id_feature_value FROM ps_feature_product WHERE id_feature = 63 AND id_product = ${temporal[key].id_product}) ; `;
                //}
                //await globalFunc.setActive(temporal[key].id_product, 1)

                if (countProductsUpdate == 500) {
                    console.log('QUERY UPDATE')
                    console.log(listaToUpdate)

                    await updateStockPrice(listaToUpdate)
                    listaToUpdate = ''
                    countProductsUpdate = 0
                }

            } else {
                console.log('no tiene numero de roducto: ' + temporal[key]);
            }
            countProductsUpdate++
        }

        await updateStockPrice(listaToUpdate)


        // 3 - #### aqui se agregarn los productos neuvos 
        const productosParaAgregar = await obtenerProductosTemporalesCtAdd()
        if (productosParaAgregar) {

            //extraemos los datos dele json original 
            for (prod3 in productosParaAgregar) {
                var newP = _.find(jsonCompletoOrigen, { 'clave': productosParaAgregar[prod3].clave })
                if (newP) {
                    var getPrice2 = (getPrecioPromocion(newP) > 0) ? getPrecioPromocion(newP) : getPrecioMxn(newP.precio, newP.moneda, newP.tipoCambio);
                    console.log('getPrice2');
                    console.log(getPrice2);
                    (porcentajeAumentoSupplier > 0) ? console.log(getPrice2*porcentajeAumentoSupplier/100 )  : console.log('else')
                    
                    

                    if(porcentajeAumentoSupplier>0){
                        var getPrice = (getPrice2 > 300) ? getPrice2 + 
                        (getPrice2*porcentajeAumentoSupplier/100 )  :  getPrice2 + 
                        (getPrice2*porcentajeAumentoSupplier2/100 )
                    }else{
                        var getPrice = getPrice2
                    }

                    console.log('nuevo if getPrice');
                    console.log(getPrice);
                    
                    
                    var getStock = getExistencia(newP.existencia);

                    // comprobar que tenga stock mayor a 0 para meterlo
                    if (getStock > 0) {
                        var idManufacturer = await globalFunc.getIdBrand(newP.marca)
                        var idCategory = 16 // base novus
                        //obtenemos la categoriaNueva, le pasamos la que trae y vemos con cual la tenemos enlazada

                        var checkCtCategory = await getCategoriaCt(newP.idSubCategoria, newP.subcategoria, newP.idCategoria, newP.categoria)
                        
                        if (checkCtCategory.level > 0) {
                            console.log('categoria nueva: ' + checkCtCategory.prestaId)
                            idCategory = checkCtCategory.prestaId
                        } else {
                            console.log('no esta dado de alta, se mete a categoria base');
                        }

                        // termina de obtener categoria
                        // aqui emepazao con temopral;
                        var supplier = 3 // ct
                        var idLastNewProduct = await insertProduct(newP, idManufacturer, idCategory, supplier, moment().format('YYYY-MM-DD HH:mm:ss'), getPrice)

                        if (idLastNewProduct.mensaje == 'ok') {
                            if (idLastNewProduct.data != 0) {
                                await insertCategoryProduct(idLastNewProduct.data, 15);
                                await insertProductLang(idLastNewProduct.data, newP)
                                await insertProductShop(idLastNewProduct.data, newP, idCategory, moment().format('YYYY-MM-DD HH:mm:ss'), getPrice)
                                await insertProductSupplier(idLastNewProduct.data, supplier, getPrice)
                                await insertStock(idLastNewProduct.data, newP, getStock)
                                var lastCategoryId = await globalFunc.getLastCategoryId()

                                //----aqui ingresamos el modelo al index, necesario para las busquedas 
                                var last_feature_value_id = await globalFunc.insertFeatureValueCustom(1) // modelo
                                if (last_feature_value_id.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_id.data, newP.modelo, id_lang)
                                    await globalFunc.insertFeatureProduct(1, idLastNewProduct.data, last_feature_value_id.data)
                                }

                                var last_feature_value_id3 = await globalFunc.insertFeatureValueCustom(3) // peso
                                if (last_feature_value_id3.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_id3.data, newP.modelo, id_lang)
                                    await globalFunc.insertFeatureProduct(3, idLastNewProduct.data, last_feature_value_id3.data)
                                }

                                var last_feature_value_idCustom = await globalFunc.insertFeatureValueCustom(63) // stock
                                if (last_feature_value_idCustom.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_idCustom.data, getStock, id_lang)
                                    await globalFunc.insertFeatureProduct(63, idLastNewProduct.data, last_feature_value_idCustom.data)
                                }

                                var last_feature_value_idCustom2 = await globalFunc.insertFeatureValueCustom(387) // Referencia
                                if (last_feature_value_idCustom2.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_idCustom2.data, newP.clave, id_lang)
                                    await globalFunc.insertFeatureProduct(387, idLastNewProduct.data, last_feature_value_idCustom2.data)
                                }

                                var last_feature_value_idCustom3 = await globalFunc.insertFeatureValueCustom(388) // Referencia
                                if (last_feature_value_idCustom3.mensaje == 'ok') {
                                    await globalFunc.insertFeatureValueLang(last_feature_value_idCustom3.data, moment().format('YYYY-MM-DD HH:mm:ss'), id_lang)
                                    await globalFunc.insertFeatureProduct(388, idLastNewProduct.data, last_feature_value_idCustom3.data)
                                }

                                if (lastCategoryId.mensaje == 'ok') {
                                    await globalFunc.insertCategoryProduct(idCategory, idLastNewProduct.data, lastCategoryId.data)

                                    console.log('pasamos a insertar imagen');

                                    if (newP.imagen != "") {
                                        try {
                                            var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                            await globalFunc.saveImagesToPath(newP.imagen, idImagen, 'ct')
                                            await globalFunc.insertImageLang(idImagen, newP.nombre, id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                        } catch (error) {
                                            //error al obtener la imagen, metemos una por default

                                            await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", idImagen, 'ct')
                                            await globalFunc.insertImageLang(idImagen, 'defaultImg', id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                        }

                                    } else {
                                        try {
                                            var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                                            await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", idImagen, 'ct')
                                            await globalFunc.insertImageLang(idImagen, 'defaultImg', id_lang)
                                            await globalFunc.insertImageShop(idLastNewProduct.data, idImagen, 1)
                                        } catch (error) {

                                        }
                                        // agregamos imagen default del producto, ya que no tiene imagen portada

                                    }

                                    //guardamos los datos DETALLES
                                    await insertDetalles(newP, idLastNewProduct.data, getPrice)
                                    //await insertFiles(newP, idLastNewProduct.data)
                                }
                            }
                        }
                    } else {
                        console.log('tiene stock 0 o precio 0');
                        console.log(newP.clave);
                        console.log(newP.existencia);
                        console.log(newP.precio);
                    }
                }
            }

        }
        console.log('Actualizacion terminada ###########################');
        console.log('Hora inicio: ' + horaInicio);
        console.log('Hora Termino: ' + moment().format('DD-MM-YYYY HH:mm:ss'));
        globalFunc.insertRegistro('UpdateCt2 Fecha inicio '+ horaInicio)
    } else {
        console.log('Error al actualizar, error en funcion ');
    }
}

const task = new Task('simple task' , () => {
    asyncCall() 
    //globalFunc.insertRegistro('UpdateCt2')
  })
const job = new SimpleIntervalJob({ minutes: 120, }, task)
scheduler.addSimpleIntervalJob(job)
// asyncCall();