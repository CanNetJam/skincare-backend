const express = require ("express");
const router = express.Router();
const accounts = require ("../models/accounts.js");
const orders = require ("../models/orders.js");
const vouchers = require ("../models/vouchers.js");
const auth = require("../middleware/auth");
const moment = require("moment");

router.get("/all-orders",  async (req, res) => {
    try {
        const allOrders = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})
        const allPreviousOrders = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.previous, $lt: req.query.start}},
        ]})

        const allSales = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})
        let sum = 0
        for (let i=0; i<allSales.length; i++){
            sum = allSales[i].amountpaid + sum
        }
        const allPreviousSales = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.previous, $lt: req.query.start}},
        ]})
        let sum2 = 0
        for (let i=0; i<allPreviousSales.length; i++){
            sum2 = allPreviousSales[i].amountpaid + sum2
        }

        const allCostumers = await accounts.find({$and: [
            {type: "Customer"},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})
        const allPreviousCustomers = await accounts.find({$and: [
            {type: "Customer"},
            {createdAt: {$gte: req.query.previous, $lt: req.query.start}},
        ]})

        const allVouchers = await vouchers.find({$and: [
            {status: "Used"},
            {updatedAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})
        const allPreviousVouchers = await vouchers.find({$and: [
            {status: "Used"},
            {updatedAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})

        const obj = {
            AllOrders: allOrders.length,
            AllPreviousOrders: allPreviousOrders.length,
            AllSales: sum,
            AllPreviousSales: sum2,
            AllCustomers: allCostumers.length,
            AllPreviousCustomers: allPreviousCustomers.length,
            AllVouchers: allVouchers.length,
            AllPreviousVouchers: allPreviousVouchers.length,
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/all-sales",  async (req, res) => {
    try {
        const allSales = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]})

        const obj = {
            AllOrders: allSales.length,
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/top-products",  async (req, res) => {
    try {
        const allProducts = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]}).populate({path:"items.item", select:["name", "displayimage"]})

        let topProducts = []
        for (let i=0; i<allProducts.length; i++){
            let match = false
            let toChange = 0
            for (let n=0; n<allProducts[i].items.length; n++) {

                if (topProducts.length===0) {
                    topProducts.push(allProducts[i].items[n])
                } else {
                    function loopThis() {
                        for (let a=0; a<topProducts.length; a++){
                            if (topProducts[a]?.item.toString()===allProducts[i].items[n]?.item.toString()){
                                match = true
                                toChange = a
                                return
                            } 
                        }
                    }
                    loopThis()
                    
                    if (match===true) {
                        topProducts[toChange] = {
                            item: topProducts[toChange].item,
                            price: topProducts[toChange].price,
                            quantity: topProducts[toChange].quantity+allProducts[i].items[n]?.quantity,
                            type: topProducts[toChange].type,
                            _id: topProducts[toChange]._id
                        }
                    } else {
                        topProducts.push(allProducts[i].items[n])
                    }
                }
            }

        }

        let sortedTopProducts = []
        function recursiveSort (props){
            if (props.length===0) {
                return
            }
            let highestNumber = 0
            let toAdd = 0
            for(let i=0; i<props.length; i++){
                if (props[i].quantity>highestNumber) {
                    highestNumber = props[i].quantity
                    toAdd = i
                }
            }
            sortedTopProducts.push(props[toAdd])
            props.splice(toAdd, 1)
            recursiveSort (props)
        }
        recursiveSort(topProducts)

        res.status(200).send(sortedTopProducts)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/top-customers",  async (req, res) => {
    try {
        const allProducts = await orders.find({$and: [
            {billingstatus: {$ne: "On Hold"}},
            {createdAt: {$gte: req.query.start, $lt: req.query.end}},
        ]}).populate({path:"userid", model: accounts, select: ["firstname", "lastname", "displayimage"]})

        let topCustomers = []
        for (let i=0; i<allProducts.length; i++){
            let match = false
            let toChange = 0
            
            if (topCustomers.length===0) {
                topCustomers.push({
                    _id: allProducts[i].userid._id,
                    name: allProducts[i].userid.firstname + " " + allProducts[i].userid.lastname,
                    displayimage: allProducts[i].userid?.displayimage,
                    email: allProducts[i].email,
                    phone: allProducts[i].phone,
                    totalamountpaid: allProducts[i].amountpaid,
                    totalorders: 1
                })
            } else {
                function loopThis() {
                    for (let a=0; a<topCustomers.length; a++){
                        if (topCustomers[a]?._id.toString()===allProducts[i].userid._id.toString()){
                            match = true
                            toChange = a
                            return
                        } 
                    }
                }
                loopThis()
                
                if (match===true) {
                    topCustomers[toChange] = {
                        _id: topCustomers[toChange]._id,
                        name: topCustomers[toChange].name,
                        displayimage: topCustomers[toChange].displayimage,
                        email: topCustomers[toChange].email,
                        phone: topCustomers[toChange].phone,
                        totalamountpaid: topCustomers[toChange].totalamountpaid + allProducts[i].amountpaid,
                        totalorders: topCustomers[toChange].totalorders + 1
                    }
                } else {
                    topCustomers.push({
                        _id: allProducts[i].userid._id,
                        name: allProducts[i].userid.firstname + " " + allProducts[i].userid.lastname,
                        displayimage: allProducts[i].userid?.displayimage,
                        email: allProducts[i].email,
                        phone: allProducts[i].phone,
                        totalamountpaid: allProducts[i].amountpaid,
                        totalorders: 1
                    })
                }
            }
        }

        let sortedTopCustomers = []
        function recursiveSort (props){
            if (props.length===0 || sortedTopCustomers.length===5) {
                return
            }
            let highestNumber = 0
            let toAdd = 0
            for(let i=0; i<props.length; i++){
                if (props[i].totalamountpaid>highestNumber) {
                    highestNumber = props[i].totalamountpaid
                    toAdd = i
                }
            }
            sortedTopCustomers.push(props[toAdd])
            props.splice(toAdd, 1)
            recursiveSort (props)
        }
        recursiveSort(topCustomers)
        res.status(200).send(sortedTopCustomers)
    } catch (err) {
        res.status(500).json(err)
    }
})

router.get("/all-monthly-sales",  async (req, res) => {
    try {
        let mongthlySales = []
        for (let i=1; i<13; i++){
            filteredOrders = await orders.aggregate([
                {$addFields: { "month" : {$month: '$createdAt'}, "year": { $year: '$createdAt' }}},
                {$match: {$and: [ {month: i}, {year: Number(moment(req.query.end).format('YYYY')) } ]}}
            ])
            //const allOrders = await orders.find({$and: [
            //    {billingstatus: {$ne: "On Hold"}}
            //]})
            //const filteredOrders = allOrders.filter((a)=>i.toString()===moment(a.createdAt).format('M') && moment(a.createdAt).format('YYYY')===moment(req.query.start).format('YYYY'))
            let sum1 = 0
            for (let n=0; n<filteredOrders.length; n++){
                sum1 = sum1 + filteredOrders[n].amountpaid
            }
            let sum2 = 0
            for (let n=0; n<filteredOrders.length; n++){
                sum2 = sum2 + filteredOrders[n].netamount
            }

            mongthlySales = mongthlySales.concat({
                id: i,
                sales: sum1,
                netamount: sum2,
                data: filteredOrders
            })
        }

        filteredOrders = await orders.aggregate([
            {$addFields: { "month" : {$month: '$createdAt'}, "year": { $year: '$createdAt' }}},
            {$match: {$and: [ {month: Number(moment(req.query.end).format('MM'))}, {year: Number(moment(req.query.end).format('YYYY')) }]}}
        ])
        let totalSales = 0
        for (let n=0; n<filteredOrders.length; n++){
            totalSales = totalSales + filteredOrders[n].amountpaid
        }
        let TotalDelivery = 0
        for (let n=0; n<filteredOrders.length; n++){
            TotalDelivery = TotalDelivery + filteredOrders[n].shippingfee
        }
        let TotalTransactionFee = 0
        for (let n=0; n<filteredOrders.length; n++){
            TotalTransactionFee = TotalTransactionFee + filteredOrders[n].transactionfee
        }

        mongthlyBreakdown = [
            {
                id: 1,
                name: "Net amount",
                count: totalSales
            },
            {
                id: 2,
                name: "Shipping Fee",
                count: TotalDelivery
            },
            {
                id: 3,
                name: "Transaction Fee",
                count: TotalTransactionFee
            }
        ]
        obj = {
            mongthlySales: mongthlySales,
            mongthlyBreakdown: mongthlyBreakdown
        }
        res.status(200).send(obj)
    } catch (err) {
        res.status(500).json(err)
    }
})

module.exports = router