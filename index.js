const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const mongoose = require("mongoose");
const mongoDbUrl = require("./config/mongodb")
const Listing = require("./model/Listing")

const gurl = "mongodb+srv://hema:1234@cluster0.ooomf.mongodb.net/craiglistscrapper?retryWrites=true&w=majority";

async function connectToMongoDb() {
    const url = "mongodb+srv://hema:1234@cluster0.ooomf.mongodb.net/craiglistscrapper?retryWrites=true&w=majority";
    await mongoose.connect(
        url, 
        { useNewUrlParser: true}
        );
    
      console.log("mongodb connected!")
}

async function scrapeListings(page) {


    await page.goto("https://sfbay.craigslist.org/d/software-qa-dba-etc/search/sby/sof");

    const html = await page.content();
    const $ = cheerio.load(html);

    // $(".result-title").each((index, element) => console.log($(element).text()));
    // $(".result-title").each((index, element) => console.log($(element).attr("href")));

    const listings = $(".result-info").map((index, element) => {   // parent elements div's class is result
        const titleElement = $(element).find(".result-title");    // element <a> child class .result-title 
        const timeElement = $(element).find(".result-date");     // element time child class .result-date
        const hoodElement = $(element).find(".result-hood");
        const title = $(titleElement).text();
        const url = $(titleElement).attr("href");
        const datePosted = new Date($(timeElement).attr("datetime")); 
        const hood = $(hoodElement).text().trim().replace("(", "").replace(")", "");
        return {title, url, datePosted, hood};
    }).get();

    return listings;
}


async function scrapeJobDescriptions(listings, page){
    for(var i = 0; i < listings.length; i++){
        await page.goto(listings[i].url,{waitUntil: 'networkidle2'});
        const html = await page.content();
        const $ = cheerio.load(html);
        const jobDescription = $("#postingbody").text();
        const compensation = $("p.attrgroup > span:nth-child(1) > b").text();
        // console.log(jobDescription);
        // console.log(compensation);
        listings[i].jobDescription = jobDescription;
        listings[i].compensation = compensation;
        const listingModel = new Listing(listings[i]);
        await listingModel.save();
        await sleep(1000); // 1 second sleep
        // This sleep() function can be used anywhere as long as you use async/  await
    }
    return listings;
}

async function sleep(miliseconds) {
    return new Promise(resolve => setTimeout (resolve, miliseconds));
}

async function main() {
    try{
    await connectToMongoDb();
    const browser = await puppeteer.launch({ headless: false});
    const page = await browser.newPage();
    const listings = await scrapeListings(page);
    const listingsWithJobDescriptions= await scrapeJobDescriptions(
        listings,
        page
    );
    console.log(listingsWithJobDescriptions);

    mongoose.disconnect();
    console.log("disconnected from mongoose !");
    } catch (err) {
        console.log(err);
    }
    
}



main();