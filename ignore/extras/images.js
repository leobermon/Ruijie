const axios = require('axios').default;
const _ = require('lodash')
const db = require('../db')
const moment = require('moment')
var schedule = require('node-schedule');
var globalFunc = require('../functions')

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
async function format_imagen(){
    var productoComplete = await getSyscomProductById(43007)
    if (productoComplete.mensaje == 'ok') {
        if (productoComplete.data.img_portada != '') {
            try {
                // var idImagen = await globalFunc.insertPsImage(idLastNewProduct.data, 1, 1)
                await globalFunc.saveImagesToPath(productoComplete.data.img_portada, 74723, 'imagenes')
            } catch (error) {
                
            }
            
         
        } else {
            try {
                await globalFunc.saveImagesToPath("https://novusred.mx/img/Novus.jpeg", 74723, 'imagenes')
            } catch (error) {
                
            }
            // agregamos imagen default del producto, ya que no tiene imagen portada
         
        }
    }

}