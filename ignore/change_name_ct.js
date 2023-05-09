const _ = require('lodash');
const db = require('./db');
const moment = require('moment');
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

function update_name(id_product_novusred,name) {
    console.log(id_product_novusred,name)
    return new Promise(resolve => {
        var sql = `UPDATE ps_product_lang SET name = "`+name+`" WHERE id_product = `+id_product_novusred+` and id_shop = 1 and id_lang = 2;
        `
        console.log(sql);
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

function get_categias_ct(idCategoria, idSubCategoria) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            // obtenemos todos los productos de syscom de la bd novusred
            conn.query(`SELECT * FROM ps_categoriaCt where idCategoria = `+idCategoria+` AND idSubCategoria = `+idSubCategoria+`;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products_repetidos'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_products_repetidos');
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
            conn.query(`select id_product, reference, supplier_reference from ps_product where supplier_reference = "`+supplier_reference+`" and id_supplier = 3`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', data: {} });
                } else {
                    if (result.length > 0) {
                        console.log('si hay datos - obtener get_products_repetidos'); 
                        resolve(result)
                    } else {
                        console.log('no hay datos - obtener get_products_repetidos');
                        resolve(false)
                    }
                }
                conn.release();
            });
        })
    });
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

            resolve({ mensaje: 'ok', data: nuevoJson })
        } catch (error) {
            resolve({ mensaje: 'fail', data: error })
        }

    });
}

async function init(){
    /*
    var downloaded = await downloadExcel()
    var downloaded = {mensaje: 'ok'}
 

    if (downloaded.mensaje == 'ok') {
        var validator = await getJsonFile() // creamos el arreglo con los datos temporales 
    } else {
        var validator = { mensaje: 'fail' }
    }
    */
    var validator = await getJsonFile()
    let name = '';
    let modelo = '';
    if (validator.mensaje == 'ok') {
        // console.log(jsonCompletoOrigen[0]);
        
        for (key in jsonCompletoOrigen) {
            // console.log(jsonCompletoOrigen[0]);
            
            let product = await get_product_by_supplier_reference(jsonCompletoOrigen[key]['clave']);
            
            if(product[0]){
                if(product[0]['id_product'] != undefined && product[0]['supplier_reference'] != undefined){
                    // console.log(product[0]);
                    if(jsonCompletoOrigen[key]['descripcion_corta'] != undefined){
                        name = jsonCompletoOrigen[key]['descripcion_corta'];
                        if(jsonCompletoOrigen[key]['modelo'] != undefined){
                            modelo = jsonCompletoOrigen[key]['modelo'];
                            if(!name.includes(`${modelo}`))
                            {
                                name = name + ' ' + modelo
                            }
                        }
                        
                        update_name(product[0]['id_product'],name);
                    }

                
                }
            }
            
            
        }
        
        
    }
    
}
init();