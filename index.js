var express = require('express');
var bodyParser = require('body-parser');
var mysql = require('mysql');
var session = require('express-session');
var moment = require('moment');
var connection = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'qwerty3129',
  database: 'ao_prokat'
});
connection.connect();
var app = express();
var urlencodedParser = bodyParser.urlencoded({
  extended: false
});
app.use(session({
  secret: 'dasfw',
  key: 'key',
  resave: false,
  saveUninitialized: false,
  //cookie: { maxAge: 60000 }
}))
app.use('/public', express.static('public'));
app.set('view engine', 'ejs');
app.get('/', function(req, res) {
  res.render('index', {
    status: req.session.status
  })
})
app.get('/login', function(req, res) {
  res.render('login')
})
const auth = function(req, res, next) {
  if (req.session.status == true) {
    return next();
  } else {
    res.redirect('/registration');
  }
}
app.post('/login', urlencodedParser, function(req, res) {
  connection.query("SELECT * FROM ao_prokat.client WHERE name = ? AND password = ?", [req.body.name, req.body.pass], function(err, result, rows) {
    if (err) {
      console.log("ОШИБКА Базы данных!");
    }
    if (result.length) {
      console.log('Пользователь Вошел!');
      req.session.status = true;
      req.session.client_id = result[0].id
      req.session.client_name = result[0].name
      res.redirect('/user')
    }
  })
})
app.post('/registration', urlencodedParser, function(req, res) {
  connection.query('INSERT INTO `ao_prokat`.`client` (`name`, `password`) VALUES ( ? , ? ) ', [req.body.name, req.body.pass], function(err) {
    if (err) {
      console.log("ОШИБКА Базы данных!");
    }
    res.redirect('/login')
  })
})
app.get('/user', auth, function(req, res) {
  connection.query('SELECT * FROM ao_prokat.client WHERE id = ?', req.session.client_id, function(err, result) {
    if (err) {
      console.log("ОШИБКА Базы данных!");
    }
    res.render('user', {
      username: result[0].name,
      car_name: req.session.car_name,
      car_model: req.session.car_model,
      kol_day: req.session.kol_day,
      cost_for_car: req.session.order_cost_for_car,
      cost_for_device: req.session.cost_for_device,
      car_id: req.session.car_id,
      other_name: req.session.other_name
    })
  })
})
var insur_agr_id
var rent_id
app.post('/order_registration', urlencodedParser, function(req, res) {
  if (typeof req.body.rent_agr == "undefined") {
    res.render("error")
  } else {
    if (typeof req.session.other_name == "undefined") {
      req.session.other_name = "Не добавил"
    }
    if (typeof req.session.cost_for_device == "undefined") {
      req.session.cost_for_device = 0
    }
    var full_cost = req.session.order_cost_for_car + req.session.cost_for_device
    var insur_info = req.session.client_name + ' Согласен(а)'
    var rent_condition = req.session.client_name + ' ' + req.session.car_model + ' ' + req.session.car_name
    connection.query('INSERT INTO `ao_prokat`.`insur_agr` (`insur_info`) VALUES (?)', [insur_info], function(error) {
      if (error) {
        console.log(error)
      }
      connection.query('SELECT * FROM ao_prokat.`insur_agr` ORDER BY id DESC LIMIT 1', function(error, result) {
        if (error) {
          console.log(error)
        }
        insur_agr_id = result[0].id
        connection.query('INSERT INTO `ao_prokat`.`rent_agr` (`rent_condition`) VALUES (?)', [rent_condition], function(error) {
          if (error) {
            console.log(error)
          }
        })
        connection.query('SELECT * FROM ao_prokat.`rent_agr` ORDER BY id DESC LIMIT 1', function(error, result) {
          if (error) {
            console.log(error)
          }
          rent_id = result[0].id
          connection.query('INSERT INTO `ao_prokat`.`order` (`client_id`, `cars_id`, `date`, `full_cost`, `rent_agr_id`, `insur_agr_id`, `start_day`, `end_day`, `add_devices_name`) VALUES ( ? , ?,  ? , ?, ? , ?, ?, ?, ?)', [req.session.client_id, req.session.car_id, moment().format('YYYY-MM-DD'), full_cost, rent_id, insur_agr_id, moment(req.session.start_day).format('YYYY-MM-DD'), moment(req.session.end_day).format('YYYY-MM-DD'), req.session.other_name], function(error) {
            if (error) {
              console.log(error)
            }
          })
        })
      })
    })
    res.redirect('/')
  }
})
app.get('/cars', function(req, res) {
  connection.query("SELECT * FROM ao_prokat.cars inner join ao_prokat.model on cars.model_id = model.id inner join ao_prokat.type on cars.type_id = type.id", function(err, result) {
    if (err) {
      console.log("ОШИБКА Базы данных!");
    }
    res.render('cars', {
      car: result,
      status: req.session.status
    })
  })
})
app.post('/carpage', urlencodedParser, function(req, res) {
  connection.query("SELECT * FROM ao_prokat.cars  inner join ao_prokat.model on cars.model_id = model.id  inner join ao_prokat.type on cars.type_id = type.id inner join ao_prokat.accidents on cars.accident_id = accidents.id WHERE cars.id = ?", [req.body.car_id], function(error, result) {
    if (error) {
      console.log("ОШИБКА Базы данных!");
    }
    res.render('carpage', {
      car: result,
      status: req.session.status
    })
  })
  req.session.car_id = req.body.car_id
})
app.post('/other_in_order', urlencodedParser, function(req, res) {
  console.log(req.body.other_id);
  connection.query('SELECT * FROM ao_prokat.add_devices WHERE id = ?', [req.body.other_id], function(error, result) {
    if (error) {
      console.log(error);
    }
    req.session.other_name = result[0].add_devices_name
    req.session.cost_for_device = result[0].devices_cost
    res.redirect('/user')
  })
})
app.post('/order', urlencodedParser, function(req, res) {
  var kol_day = moment(req.body.end_time).diff(moment(req.body.start_time), 'days')
  var cost_for_car = req.body.car_id * kol_day
  console.log(req.body.car_id, kol_day, cost_for_car);
  req.session.start_day = req.body.start_time
  req.session.end_day = req.body.end_time
  req.session.order_cost_for_car = cost_for_car
  req.session.kol_day = kol_day
  req.session.car_model = req.body.car_model
  req.session.car_name = req.body.car_name
  res.redirect('/user')
})
app.get('/registration', function(req, res) {
  res.render('registration')
})
app.post('/clear_order', function(req, res) {
  req.session.order_cost_for_car = null
  req.session.kol_day = null
  req.session.car_model = null
  req.session.car_name = null
  req.session.other_name = null
  req.session.cost_for_device = null
  console.log(req.session);
  res.redirect('/user')
})
app.post('/admin', urlencodedParser, function(req, res) {
  connection.query("SELECT * FROM ao_prokat.admin WHERE name = ? AND password = ?", [req.body.name, req.body.pass], function(error, result, rows) {
    if (error) {
      console.log(error);
    }
    if (result.length) {
      console.log('Пользователь Вошел!');
      req.session.status_admin = true;
      req.session.admin_name = result[0].name
      res.redirect('/admin')
    }
  })
})
app.get('/admin', function(req, res) {
  connection.query("SELECT * FROM ao_prokat.order inner join ao_prokat.client on order.client_id = client.id inner join ao_prokat.cars on order.cars_id = cars.id", function(error, result) {
    if (error) {
      console.log(error);
    }
    res.render('admin', {
      result: result
    })
  })
})
app.get('/other', function(req, res) {
  console.log(req.session);
  connection.query("SELECT * FROM ao_prokat.add_devices", function(err, result) {
    if (err) {
      console.log("ОШИБКА Базы данных!");
    }
    res.render('other', {
      other: result,
      status: req.session.status
    })
  })
})
app.get('/login_admin', function(req, res) {
  res.render('login_admin')
})
app.post("/logaut", urlencodedParser, function(req, res) {
  req.session.destroy(() => {
    res.redirect('/');
  });
})
app.listen(3001);
