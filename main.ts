import axios, { AxiosResponse } from 'axios';
import dotenv from 'dotenv';
import { Twilio } from 'twilio';
import { Campground, Options } from './types';
import { isEmpty } from './helpers';
import { campgroundDirectory } from './campgrounds';
// const colors = require('colors/safe');
// var colors = require('colors');
import colors from 'colors';
import cron from "node-cron";
dotenv.config();

const getCampgroundAsync = async (campground: Campground, options: Options): Promise<null | AxiosResponse> =>  {
    try {
        return await axios({
            method: 'post',
            url: 'https://calirdr.usedirect.com/RDR/rdr/search/grid', 
            headers: {
                "Content-Type": "application/json",
                "Accept-Encoding": "gzip,deflate,compress" 
              },
            data: {
                "StartDate": options.startDate,
                "EndDate": options.endDate,
                "UnitSort": "orderby",
                "FacilityId": campground.id,
            }
    
        })
        .then((response) => {
            return response.data;
        });
    } catch (err) {
        return err;
    }
}

const campgroundIsAvailable = (campgroundAvailability, options) => {
    const campgroundDates = campgroundAvailability["Slices"];
    const isFilledOnOneDayOfRange = Object.keys(campgroundDates).map((key) => campgroundDates[key]).filter((date) => !date["IsFree"]);
    return isFilledOnOneDayOfRange.length === 0 && campgroundAvailability.SliceCount !== 0;
}

const isCampgroundAvailableAsync = async () : Promise<boolean> =>  {
    // Do input handling
    const argv = require('yargs/yargs')(process.argv.slice(2))
    .alias('c', 'campground')
    .alias('s', 'start')
    .alias('e', 'end')
    .alias('f', 'from')
    .alias('t', 'to')
    .usage('Usage: $0 -campground [campground] -start [start date e.g. \"2023-01-05\"] -end [start date e.g. \"2023-01-07\"] –from [phone number] -to [phone number]')
    .default({
        'c' : "Carpinteria Santa Cruz",
        'start': "2023-01-29",
        'end': "2023-01-30",
        'from': "+13854693473",
        'to': "+15105047984"
    })
    .argv;
    
    // Get campground availability
    const availability = await getCampgroundAsync(
        campgroundDirectory[argv.campground], 
        {
            startDate: argv.start, 
            endDate: argv.end
        }
    );

    // Get and format time of request for logging
    const currentTime = new Date();
    const timeWithAmPm = currentTime.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const month = currentTime.getMonth() + 1; //months from 1-12
    const day = currentTime.getDate();
    const year = currentTime.getFullYear();
    const timeOfAvailabilityCheck = `${month}/${day}/${year} at ${timeWithAmPm}`;
    console.log(colors.green(`Got availablilitity for ${argv.c} at ${timeOfAvailabilityCheck}!`)); 
    
    // Turn Object of campground id keys into array, [ {campground}, {campground}, etc. ]
    const campgrounds = availability["Facility"]["Units"];
    const campgroundsArray = Object.keys(campgrounds).map((key) => campgrounds[key]);

    // Filter the campgrounds by the ones that are available
    const availableCampgroundsDataNeeded = 
        campgroundsArray
        .filter((campground) => campgroundIsAvailable(campground, {})) // Add options for filtering later
        .map((campground) => ({name: campground["Name"]})) // Get only name

    if(!isEmpty(availableCampgroundsDataNeeded)){
        console.log(colors.blue(`Woohoo! There are ${availableCampgroundsDataNeeded.length} available at ${argv.campground}.`));
        
        // Send a text message alert!
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumberFrom = argv.from;
        const phoneNumbnerTo = argv.to;
        const client = new Twilio(accountSid, authToken);

        client.messages
        .create({ body: `${availableCampgroundsDataNeeded.length} campgrounds available! woohoo!`, from: phoneNumberFrom, to: phoneNumbnerTo })
        .then(message => console.log(message.sid));

        return true;
    } else {
        console.log(colors.red(`There are no campgrounds available at ${argv.campground} during this time frame.`));
        return false;
    }
}

const setUpCronJobAsync = async () => {
    const task = cron.schedule("* * * * *", async () => {
        if(await isCampgroundAvailableAsync()){
            task.stop();
        }
    });

}

setUpCronJobAsync();