[![Stories in Ready](https://badge.waffle.io/solid-live/slideshow.png?label=ready&title=Ready)](https://waffle.io/solid-live/slideshow)
# slideshow

slideshow app for the solid framework

# Demos

* https://solid-live.github.io/slideshow/
* https://solid-live.github.io/slideshow/?playlist=https://melvin.databox.me/p1

# Model

Slideshows are modelled in one of two ways.

Either Via an LDP container using mtime which could also be a flat file.

Or using Playlist slots using the playlist ontology.

## LDPC Style

This style uses the modified time in a container to order the items

```turtle
@prefix rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#> .

<>
    <http://www.w3.org/ns/ldp#contains> 
      <https://www.youtube.com/watch?v=Pq9yPrLWMyU>, 
      <https://www.youtube.com/watch?v=meBbDqAXago> .
```

# Query Parameters

## Sorting

Using the `sort` query parameter it is possible to sort asc | desc
