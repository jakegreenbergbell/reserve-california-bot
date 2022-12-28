import {Campground} from './types'

interface campgroundDirectoryType {
    [key: string]: Campground;
  }

export const campgroundDirectory: campgroundDirectoryType = {
    "Carpinteria Santa Cruz" : {
        id: 358,
        name: "Carpinteria Santa Cruz"
    },
    "Big Sur South Camp" : {
        id: 611,
        name: "Big Sur South Camp"
    },
    "Big Sur Weyland Camp" : {
        id: 612,
        name: "Big Sur Weyland Camp"
    },
    "Big Sur Main Camp" : {
        id: 767,
        name: "Big Sur Main Camp"
    }
}