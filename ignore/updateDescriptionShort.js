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

function obtenerFechaSemanaPasada(){
    const fechaActual = new Date();
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
    fechaActual.setDate(fechaActual.getDate() - 16);
    let fecha_formateada = fechaActual.getFullYear() + "-" + meses[fechaActual.getMonth() + 1] + "-" + fechaActual.getDate() + " " + fechaActual.getHours() + ":" + fechaActual.getMinutes() + ":" + fechaActual.getSeconds();

    return fecha_formateada;
}

function obtenerProductoNuevosSemanaActual(fecha){
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query('SELECT product.id_product, manufacturer.name, product.reference, product_lang.name as titulo, product_lang.description, product.date_add from ps_product as product inner join ps_product_lang as product_lang on product.id_product = product_lang.id_product inner join ps_manufacturer as manufacturer on product.id_manufacturer = manufacturer.id_manufacturer where product.date_add >= "'+fecha+'"', function (error, result){
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
            })
        })
    })
}

async function update(sql) {
    return new Promise(resolve => {
        db.getConnection((err, conn) => {
            conn.query(sql, function (error, result) {
                if (error) resolve({ mensaje: 'fail', data: error });
                console.log('Se ha actualizado' + result);
                resolve({ mensaje: 'ok', data: result })
                conn.release();
            });
        })
    })
}

async function asyncCall(){
    console.log('Ejecutando actualizacion de descripciones cortas')
    let fecha = obtenerFechaSemanaPasada();
    var datos = await obtenerProductoNuevosSemanaActual(fecha);
    var sql = "";

    console.log(datos);

    for(key in datos){
        var nuevaDescripcion = datos[key].description;
        console.log('saludos dentro');
        
        var description = nuevaDescripcion.replace(/&nbsp;/g, ' ');
        var description2 = description.replace(/^\s+|\s+$|\s+(?=\s)/g, ' ');
        var description3 = description2.replace(/<[^>]*>?/gm, ' ');
        var description4 = description3.replace(/^\s+|\s+$|\s+(?=\s)/g, '');
        var description5 = description4.replace(/\r?\n|\r/g,' ');
        var description6 = description5.replace(/\r?\n|\r/, ' ');
        var description7 = description6.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, '');
        var descripcionArmada = datos[key].name + ' ' + datos[key].reference + ' ' + datos[key].titulo + ' ' + description7;
        var descripcion = descripcionArmada.substr(0, 800);

        sql += "UPDATE ps_product_lang SET description_short = '"+descripcion+"' WHERE id_product = '"+datos[key].id_product+"';";
        console.log(sql);
        update(sql);
        sql = "";
    }

    
    console.log("Se han actualizado las descripciones cortas de los productos de la ultima semana");
}

asyncCall();