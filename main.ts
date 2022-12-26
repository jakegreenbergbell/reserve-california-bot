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
            console.log(colors.green(`Got availablilitity for ${campground.name} at ${timeOfAvailabilityCheck}!`)); 
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
    .array('c')
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
        'from': process.env.TWILIO_PHONE_NUMBER_FROM,
        'to': process.env.PHONE_NUMBER_TO
    })
    .argv;
    
    // Get campground availability for all entered campgrounds
    const campgroundAvailabilityPromises = [];
       

    argv.c.forEach((campground) => {
        campgroundAvailabilityPromises.push(
            getCampgroundAsync(
                campgroundDirectory[campground], 
                {
                    startDate: argv.start, 
                    endDate: argv.end
                }
            )
        );
    })
       
    const availabilities : ReadonlyArray<any>  = await Promise.all(campgroundAvailabilityPromises) // any 
        .then((results) => {
            return results;
        })
        .catch((e) => {
            console.log(e);
            return [];
        });
    
    if(isEmpty(availabilities)){
        console.log(colors.red("Error occurred while fetching campground availabiltiies."));
        return true;
    }

    let allAvailableCampgroundsDataNeeded = [];
    availabilities.forEach((availability) => {
        // Turn each Object of campground id keys into array, [ {campground}, {campground}, etc. ]
        const campgrounds = availability["Facility"]["Units"];
        const campgroundsArray = Object.keys(campgrounds).map((key) => campgrounds[key]);

        // Filter the campgrounds by the ones that are available
        const availableCampgroundsDataNeeded = 
            campgroundsArray
            .filter((campground) => campgroundIsAvailable(campground, {})) // Add options for filtering later
            .map((campground) => ({name: campground["Name"]})); // Get only name

        if(!isEmpty(availableCampgroundsDataNeeded)){
            console.log(colors.magenta(`Found ${availableCampgroundsDataNeeded.length} at ${availability["Facility"]["Name"]}!`))
        }

        allAvailableCampgroundsDataNeeded = allAvailableCampgroundsDataNeeded.concat(availableCampgroundsDataNeeded);
    })

    // Send alerts and logs for what was found
    if(!isEmpty(allAvailableCampgroundsDataNeeded)){
        console.log(colors.blue(`Woohoo! There are ${allAvailableCampgroundsDataNeeded.length} campsites available at your selected campgrounds.`));
        
        // Send a text message alert!
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const phoneNumberFrom = argv.from;
        const phoneNumbnerTo = argv.to;
        const client = new Twilio(accountSid, authToken);

        // client.messages
        // .create({ body: `${allAvailableCampgroundsDataNeeded.length} campgrounds available! woohoo!`, from: phoneNumberFrom, to: phoneNumbnerTo })
        // .then(message => console.log(message.sid));

        return true;
    } else {
        const campgroundNamesString = argv.c.reduce(
            (accumulator, currentValue) => accumulator + currentValue + ", ",
            ""
          );
        console.log(colors.red(`There are no campsites available at any of ${campgroundNamesString}during this time frame.`));
        return false;
    }    
}

const setUpCronJobAsync = async () => {
    // yargs input setup
    const argv = require('yargs/yargs')(process.argv.slice(2))
    .array('c')
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
        'from': process.env.TWILIO_PHONE_NUMBER_FROM,
        'to': process.env.PHONE_NUMBER_TO
    })
    .argv;

    // Check for valid campground inputs
    argv.campground.forEach((campground) => {
        if(!campgroundDirectory[campground]){
            console.log(colors.red("Campground input didn't find a match."));
            return true;
        }
    })
    
    // Start cron job
    const task = cron.schedule("* * * * *", async () => {
        if(await isCampgroundAvailableAsync()){
            task.stop();
        }
    });

}

setUpCronJobAsync();