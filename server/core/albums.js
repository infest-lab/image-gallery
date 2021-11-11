const db = require('./db');
const library = require('./library');
const Promise = require('bluebird');
const UniqueFilenames = require('../lib/unique-filenames');

function createAlbum({name, description, permalink, date, createDate = new Date().toISOString()}) {
  return db.insertAlbum({
    name: name,
    description: description,
    permalink: permalink,
    date: date,
    lastModified: createDate,
    createDate,
    images: []
  });
}

function updateAlbum(id, {name, permalink, date}) {
  return db.findAlbum({ _id: id })
    .then(album => db.updateAlbum({_id: album._id},
      {...album, name, permalink, date}));
}

function generateTitle(filename){
  let pos = filename.lastIndexOf(".");
  filename = filename.substr(0, pos < 0 ? filename.length : pos) + "";
  filename = filename.replace(/[&\/\\#,+()\-$~%.'":*?<>{}]/g,' ');
  return filename;
}

function addImages(id, paths) {
  return db.findAlbum({ _id: id })
    .then(album => Promise.map(paths, path => library.getImageDetails(path), { concurrency: 5 })
        .map(imageDetails => ({
          filename: imageDetails.filename,
          title: generateTitle(imageDetails.filename),
          url: imageDetails.path,
          width: imageDetails.width,
          height: imageDetails.height
        }))
        .then(images => {
          const newImagesMap = images.reduce((map, image) => { map[image.url] = image; return map}, {});
          const oldImages = album.images.reduce((list, image) => {
            if (newImagesMap[image.url]) {
              // adding the same image, update properties and preserve only previous filename
              list.push({...newImagesMap[image.url], filename: image.filename});
              delete newImagesMap[image.url];
            } else {
              list.push(image);
            }
            return list;
          }, []);
          const allImages = new UniqueFilenames(oldImages.map(image => image.filename));
          const newImages = images.filter(image => !!newImagesMap[image.url])
            .map(image => ({...image, filename: allImages.getUniqueFilename(image.filename)}));
          return [...newImages, ...oldImages];
        })
        .then(images => db.updateAlbum({_id: album._id}, {
          ...album, images, lastModified: new Date().toISOString()
        })));
}

function updateTitles(id, imageTitles) {
  return db.findAlbum({ _id: id })
    .then(album => {
      const images = album.images.reduce((newList, image) => {
        const found = imageTitles.filter((img) => {
          return img.filename == image.filename
        })
        if (found) {
          image.title = found[0].title  
        }
        newList.push(image);
        return newList;
      }, []);
      return db.updateAlbum({_id: album._id}, {...album, images});
    });
}

function removeImages(id, filenames) {
  return db.findAlbum({ _id: id })
    .then(album => {
      const imagesToRemove = filenames.reduce((map, filename) => { map[filename] = true; return map}, {});
      const images = album.images.reduce((newList, image) => {
        if (!imagesToRemove[image.filename]) {
          newList.push(image);
        }
        return newList;
      }, []);
      return db.updateAlbum({_id: album._id}, {...album, images});
    });
}

function removeAlbum(id) {
  return db.removeAlbum({ _id: id });
}

function setImagesOrder(id, filenames) {
  return db.findAlbum({ _id: id })
    .then(album => {
      if (!album) {
        throw new Error('Album not found');
      }
      const imagesMap = album.images.reduce((map, image) => {
        map[image.filename] = image;
        return map;
      }, {});
      const images = filenames.reduce((list, filename) => {
        if (!imagesMap[filename]) {
          throw new Error('Image does not exists');
        }
        list.push(imagesMap[filename]);
        delete imagesMap[filename];
        return list;
      }, []);
      if (Object.keys(imagesMap).length !== 0 || images.length !== album.images.length) {
        throw new Error('Wrong request, invalid number of images.')
      }
      return db.updateAlbum({_id: id}, {...album, images});
    });
}

module.exports = {
  createAlbum, updateAlbum, removeAlbum, addImages, removeImages, setImagesOrder, updateTitles, generateTitle
}
