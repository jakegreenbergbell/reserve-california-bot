import axios, { AxiosResponse } from 'axios';

const carpinteriaSantaCruz = {
    id: 358
};

interface Campground {
    id: number;
}

interface Options {
    startDate: string;
    endDate: string;

}


const getCampgroundAsync = async (campground: Campground, options: Options): Promise<null | AxiosResponse> =>  {
    console.log(`Searching campground ${campground.id} from ${options.startDate} to ${options.endDate}`);
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

interface campgroundAvailabilities {
    datesAvailable: ReadonlyArray<Date>
}

const campgroundIsAvailable = (campgroundAvailability, options) => {
    const campgroundDates = campgroundAvailability["Slices"];
    const isFilledOnOneDayOfRange = Object.keys(campgroundDates).map((key) => campgroundDates[key]).filter((date) => !date["IsFree"]);
    return isFilledOnOneDayOfRange.length === 0;
}

const main = async ()  => {
    // Get campground availability
    const availability = await getCampgroundAsync(carpinteriaSantaCruz, {startDate: "2023-01-30", endDate: "2023-01-31"});
    const campgrounds = availability["Facility"]["Units"];

    // Turn Object of campground id keys into array, [ {campground}, {campground}, etc. ]
    const campgroundsArray = Object.keys(campgrounds).map((key) => campgrounds[key]);
    
    // Filter the campgrounds by the ones that are available
    const availableCampgroundsDataNeeded = 
        campgroundsArray
        .filter((campground) => campgroundIsAvailable(campground, {})) // Add options for filtering later
        .map((campground) => ({name: campground["Name"]})) // Get only name
    
    console.log("Available campgrounds at carpinteria:")
    console.log(availableCampgroundsDataNeeded);
}

main();

