const fs = require('fs');
const fsPromises = require('fs').promises;
const Promise = require('bluebird');
const readFile = Promise.promisify(fs.readFile, {context: fs});
const config = require('./core/config');
const albums = require('./core/albums');
const library = require('./core/library');
const db = require('./core/db');
const initialize = require('./core/initialize');
const thumbnails = require('./core/thumbnails');
const findIt = require('findit')
var finder = findIt('/home/yat/Pictures/Photos/FLICKR_INFEST');
require('events').EventEmitter.prototype._maxListeners = 0;

function dateProvider() {
  let date = new Date();
  return function next() {
    date = new Date(date.getTime());
    date.setSeconds(date.getSeconds() + 10);
    return date;
  }
}

function findFile(photoId, libDir){
  return new Promise((resolve, reject)=>{
    finder.on('file', function (file) {
      if(file.indexOf(`${photoId}_o`) !== -1){
        resolve(file)
      }else{
        reject('File not found')
      }
    })
  })
}

const getDate = dateProvider();

initialize()
  .then(() => config.initialize())
  .then(() => {
    const albumsList = JSON.parse(fs.readFileSync(`${config.libraryDir}/flickrdata/albums.json`));
    const fileList = JSON.parse(fs.readFileSync(`${config.libraryDir}/flickrdata/listfiles.json`));
    library.createDirectory(``, 'flickr').then(flickr=>{
      Promise.mapSeries(albumsList.albums.reverse(), album => {
        // console.log('album: ', album.created)
        
        let name = album.title;
        let description = album.description;
  
        const dateCreated = new Date(parseInt(album.created)*1000)
        // console.log(dateCreated)
        
        const year = `${dateCreated.getFullYear()}`
        const month = dateCreated.getMonth() < 10 ? `0${dateCreated.getMonth()}` : `${dateCreated.getMonth()}`
        const day = dateCreated.getDay() < 10 ? `0${dateCreated.getDay()}` : `${dateCreated.getDay()}`
  
        const permalink = `${year}/${month}/${albums.generateTitle(name).replace(/[&\/\\#,+()\-$~%.'":*?<>{}\ ]/g,'_')}`;
        const date = `${year}-${month}-${day}`;
        const createDate = getDate().toISOString();

        //CREATE ALBUM
        return albums.createAlbum({
          name,
          description,
          permalink,
          date,
          createDate,
        }).then(doc => {
          // CREATE DIRECTORY
          const dirPhotos =  `${albums.generateTitle(name)} ${new Date().getTime()}`.replace(/[&\/\\#,+()\-$~%.'":*?<>{}\ ]/g,'_')
          return library.createDirectory(`flickr`, dirPhotos).then(dir=>{
            
            const libDir = `${config.libraryDir}/flickr/${dir}`
            console.log(dir, libDir)
            // LOOP PHOTOS
            Promise.mapSeries(album.photos, photoId => {
              // COPY PHOTO FILE TO LIB DIR             
              if(photoId !== '0'){
                return readFile(`${config.libraryDir}/flickrdata/photo_${photoId}.json`)
                .then(photo => JSON.parse(photo))
                .then(photo => {
                  const searchFile = fileList.filter(file=>file.indexOf(`${photoId}_o`) !== -1)
                  if(searchFile.length > 0){
                    const file = `${new Date().getTime()}.${searchFile[0].split('.').pop()}`
                    // const file = searchFile[0]
                    // console.log(`Copy ${searchFile[0]} to ${libDir}/${file}`)
                    return fsPromises.copyFile(`/home/yat/Pictures/Photos/FLICKR_INFEST/${searchFile[0]}`, `${libDir}/${searchFile[0]}`)
                    .then(function() {
                      // console.log(`${libDir}/${file}`, "File Copied");
                      return library.getImageDetails(`/flickr/${dir}/${searchFile[0]}`).then(imageDetails=>{
                        // console.log(imageDetails)
                        const item = {
                          filename: imageDetails.filename,
                          title: photo.description ? photo.description : photo.name,
                          url: `/flickr/${dir}/${imageDetails.filename}`,
                          width: imageDetails.width,
                          height: imageDetails.height
                        }
                        
                        return db.findAlbum({ _id: doc._id })
                        .then(alb => {  
                          // let images = [...alb.images, ...item]
                          // console.log(images)     
                          alb.images.push(item)               
                          return db.updateAlbum({_id: alb._id}, {...alb, lastModified: new Date().toISOString()});
                        });
                      })
                    })
                    .catch(function(error) {
                      console.log('Error bro: ', error);
                    });
                  }
                })
              }
              
              return 0
            }, {concurrency: 1});
          })
  
          
  
          // return readFile(`${config.libraryDir}${album.src}/photos.json`)
          //   .then(photos => JSON.parse(photos))
          //   .then(photos => {
          //     const fileList = photos.map(photo => `${album.src}/${photo.file}`);
          //     return {
          //       lastModified: new Date(photos.sort((a, b) => a.ctime < b.ctime ? 1 : -1)[0].ctime).toISOString(),
          //       list: fileList
          //     }
          //   })
          //   .then(photos => {
          //     return albums.addImages(doc._id, photos.list)
          //       .then(() => db.findAlbum({_id: doc._id}))
          //       .then(album => db.updateAlbum({_id: album._id},
          //         {...album, lastModified: photos.lastModified}))
          //       .then(() => thumbnails.create(photos.list, 10));
          //   });
        });
      }, {concurrency: 1});
    })
    
  });
