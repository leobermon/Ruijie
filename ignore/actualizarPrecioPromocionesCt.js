const fs = require('fs');
const client = require('https');
const _ = require('lodash');
const db = require('./db');
var sharp = require('sharp');
const moment = require('moment');
var schedule = require('node-schedule');
var globalFunc = require('./functions');
var Client = require('ftp');
// const parser = require('xml2json');
const id_lang = 2;
const id_tax = 53;
var porcentajeAumentoSupplier = 0
var porcentajeAumentoSupplier2 = 0 
var porcentajeSupplier = 0;
const categoriasComputo = [1722,1750,2917,2921,2924,2926,2927];

// ciudad juarez = CJS // mexicali = MXL // Tijuana = TIJ // Ensenada = ENS // La paz - PAZ // Tapachula = TAP
const ciudadesNoAdmitidas = ["CJS", "MXL", "TIJ", "ENS", "PAZ", "TAP"]
let jsonCompletoOrigen = []

const { ToadScheduler, SimpleIntervalJob, Task } = require('toad-scheduler');
const { reject } = require('lodash');
const { resolve } = require('path');
const scheduler = new ToadScheduler()

function resolveAfter2Seconds(s) {
    return new Promise(resolve => {
      setTimeout(() => {
        resolve('resolved');
      }, s);
    });
}

function obtenerFecha(){
    let fechaActual= new Date();
    const meses = [
        "00",
        "01",
        "02",
        "03",
        "04",
        "05",
        "06",
        "07",
        "08",
        "09",
        "10",
        "11",
        "12"
    ]
    let fecha_formateada = fechaActual.getFullYear() + "-" + meses[fechaActual.getMonth() + 1] + "-" + fechaActual.getDate();
    
    return fecha_formateada;
}

function descargarXML() {
    return new Promise(resolve => {
        var c = new Client();
        c.on('ready', function () {
            c.get('catalogo_xml/productos.xml', function (err, stream) {
                if (err) {
                    resolve({ mensaje: 'fail', data: {} })
                } else {
                    stream.once('close', function () { c.end(); });
                    stream.pipe(fs.createWriteStream('ct/productosCt.xml'));
                    stream.pipe(fs.createWriteStream('ct/xml/File-' + moment().format('DD-MM-YYYY_HH-mm-ss') + '.xml'));

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

function actualizarPrecioCt(id, precio) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(`UPDATE ps_product_shop SET price = ` + precio + ` where id_product = `+ id +`;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', err });
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

function actualizarPrecioCtProduct(id, precio) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(`UPDATE ps_product SET price = ` + precio + ` where id_product = `+ id +`;`, function (err, result) {
                if (err) {
                    resolve({ mensaje: 'error, no data DB', err });
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

function obtenerIdProductoCt(reference) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(`SELECT id_product FROM ps_product where supplier_reference = '`+ reference +`' AND id_supplier = 3;`, function (err, result) {
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

async function calculoPrecioCt(clave, precio, fechIni, fechFin, tipoCambio){
    console.log("hola");
    let fecha = obtenerFecha();
    let productos = [];
    if(fechIni <= fecha && fechFin >= fecha)
    {
        console.log("Estas vigente");
        let precioF = precio * tipoCambio;
        let cal = precioF * 1.15;
        console.log(cal);

        let id = await obtenerIdProductoCt(clave);

        if(id)
        {
            console.log(id[0]['id_product']);
            console.log(await actualizarPrecioCt(id[0]['id_product'], cal));
            console.log(await actualizarPrecioCtProduct(id[0]['id_product'], cal));
        }
    }
    console.log(fecha);
}

async function obtenerInformacionXMLCT(){
    var downloaded = await descargarXML()
    let productos = [];
    let cont = 0;
    xml2js = require('xml2js');
 
    var parser = new xml2js.Parser();
    fs.readFile(__dirname + '/ct/productosCT.xml', function(err, data) {
        parser.parseString(data, function (err, result) {
            console.dir(result['Articulo']['Producto']);

            let jsonData = result['Articulo']['Producto'];

            for(var k in jsonData) {
                // if(k > 2636)
                // {
                    console.log(k, jsonData[k]['clave']);
        
                    if(jsonData[k].hasOwnProperty('promo'))
                    {
                        console.log("si tiene " + jsonData[k]['promo']);
                        productos.push(jsonData[k]['clave']);
                        cont++;
                        calculoPrecioCt(jsonData[k]['clave'], jsonData[k]['promo'], jsonData[k]['fecha_ini'], jsonData[k]['fecha_fin'], jsonData[k]['tipo_cambio']);
                    }
                // }
            }
            console.log(productos);
            console.log(cont);
            console.log('Done');
        });
    });
    
}

const task = new Task('simple task' , () => {
    obtenerInformacionXMLCT()
  })
const job = new SimpleIntervalJob({ minutes: 120, }, task)
scheduler.addSimpleIntervalJob(job)
// obtenerInformacionXMLCT()