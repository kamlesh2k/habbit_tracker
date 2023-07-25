const express = require('express');
const router = express.Router();

//---------User model----------//
const User = require('../models/User');
const Habit = require('../models/Habit');

//---------Welcome Page----------//
router.get('/', (req, res) => res.render('welcome'));

//---------Dashboard GET----------//
var email = "";
router.get('/dashboard', async (req, res) => {
    email = req.query.user;
    const user = await User.findOne({ email: req.query.user });
    const habits = await Habit.find({ email: req.query.user });

    var days = [];
    days.push(getD(0));
    days.push(getD(1));
    days.push(getD(2));
    days.push(getD(3));
    days.push(getD(4));
    days.push(getD(5));
    days.push(getD(6));

    res.render('dashboard', { habits, user, days });
});


//------------------Function to return date string--------------//
function getD(n) {
    let d = new Date();
    d.setDate(d.getDate() + n);
    var newDate = d.toLocaleDateString('pt-br').split( '/' ).reverse( ).join( '-' );
    var day;
    switch (d.getDay()) {
        case 0: day = 'Sun';
            break;
        case 1: day = 'Mon';
            break;
        case 2: day = 'Tue';
            break;
        case 3: day = 'Wed';
            break;
        case 4: day = 'Thu';
            break;
        case 5: day = 'Fri';
            break;
        case 6: day = 'Sat';
            break;
    }
    return { date: newDate, day };
}

//-------------Handle Change View: Daily <--> Weekly--------------//
router.post('/user-view', async (req, res) => {
    try {
        const user = await User.findOne({ email });

        if (user) {
            user.view = user.view === 'daily' ? 'weekly' : 'daily';
            await user.save();
            return res.redirect('back');
        } else {
            console.log("User not found!");
        }
    } catch (err) {
        console.log("Error changing view!", err);
    }
});


//---------Dashboard Add Habit----------//
router.post('/dashboard', async (req, res) => {
    try {
        const { content } = req.body;

        const habit = await Habit.findOne({ content, email });

        if (habit) {
            let dates = habit.dates;
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const today = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);

            const habitExists = dates.find(item => item.date === today);

            if (habitExists) {
                console.log("Habit exists!");
                req.flash('error_msg', 'Habit already exists!');
                return res.redirect('back');
            } else {
                dates.push({ date: today, complete: 'none' });
                habit.dates = dates;
                await habit.save();
                console.log(habit);
                return res.redirect('back');
            }
        } else {
            const dates = [];
            const tzoffset = (new Date()).getTimezoneOffset() * 60000;
            const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
            dates.push({ date: localISOTime, complete: 'none' });

            const newHabit = new Habit({
                content,
                email,
                dates
            });

            await newHabit.save();
            console.log(newHabit);
            return res.redirect('back');
        }
    } catch (err) {
        console.log(err);
    }
});


//---------Dashboard Add/Remove Habit to/from Favorites----------//
router.get("/favorite-habit", async (req, res) => {
    try {
        const id = req.query.id;

        const habit = await Habit.findOne({
            _id: id,
            email
        });

        if (habit) {
            habit.favorite = !habit.favorite;
            await habit.save();

            req.flash(
                'success_msg',
                habit.favorite ? 'Habit added to Favorites!' : 'Habit removed from Favorites!'
            );
            return res.redirect('back');
        } else {
            console.log("Habit not found!");
        }
    } catch (err) {
        console.log("Error adding to favorites!", err);
    }
});


//-------------Update status of habit completion--------------//
router.get("/status-update", async (req, res) => {
    try {
        const date = req.query.date;
        const id = req.query.id;

        const habit = await Habit.findById(id);

        if (!habit) {
            console.log("Habit not found!");
            return;
        }

        let dates = habit.dates;
        let found = false;

        dates.forEach(item => {
            if (item.date === date) {
                if (item.complete === 'yes') {
                    item.complete = 'no';
                } else if (item.complete === 'no') {
                    item.complete = 'none';
                } else if (item.complete === 'none') {
                    item.complete = 'yes';
                }
                found = true;
            }
        });

        if (!found) {
            dates.push({ date: date, complete: 'yes' });
        }

        habit.dates = dates;
        await habit.save();

        console.log(habit);
        res.redirect('back');
    } catch (err) {
        console.log("Error updating status!", err);
    }
});


//---------Deleting a habit----------//
router.get("/remove", async (req, res) => {
    try {
        const id = req.query.id;

        const result = await Habit.deleteMany({
            _id: id,
            email
        });

        if (result.deletedCount > 0) {
            req.flash('success_msg', 'Record(s) deleted successfully!');
        } else {
            console.log("No record(s) found!");
        }

        return res.redirect('back');
    } catch (err) {
        console.log("Error in deleting record(s)!", err);
    }
});

module.exports = router;