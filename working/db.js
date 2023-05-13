const e = require('express');
const mysql = require('mysql');
const { sendDataToProcessId } = require('pm2');


const connection = mysql.createPool({ 
  host: 'ruijie.c0p98o8fmuaz.us-east-2.rds.amazonaws.com',
  user: 'admin', 
  password: 'Madotaloalo11',
  database: 'ruijie_db_test',
  port: 3306,  
  multipleStatements: true 
});  

module.exports = {
  getConnection: (callback) => { 
    return connection.getConnection(callback); 
  }
}

