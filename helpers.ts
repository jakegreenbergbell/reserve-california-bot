import { Campground, Options } from './types';
import axios, { AxiosResponse } from 'axios';
import colors from 'colors';
import { Twilio } from 'twilio';

export const isEmpty = (array: ReadonlyArray<any>) => {
    return array.length === 0;
}

export const getCampgroundAsync = async (campground: Campground, options: Options): Promise<null | AxiosResponse> =>  {
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

export const campgroundIsAvailable = (campgroundAvailability, options) => {
    const campgroundDates = campgroundAvailability["Slices"];
    const isFilledOnOneDayOfRange = Object.keys(campgroundDates).map((key) => campgroundDates[key]).filter((date) => !date["IsFree"]);
    return isFilledOnOneDayOfRange.length === 0 && campgroundAvailability.SliceCount !== 0; // When campsite is unavailable, slice count is set to 0
}

export const sendTwilioSmsAsync = async (from, to, numberOfAvailableCampgrounds) => {
    // Send a text message alert!
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const phoneNumberFrom = from;
    const phoneNumbnerTo = to;
    const client = new Twilio(accountSid, authToken);

    client.messages
    .create({ body: `${numberOfAvailableCampgrounds} campgrounds available! woohoo!`, from: phoneNumberFrom, to: phoneNumbnerTo })
    .then(message => console.log(message.sid));
}