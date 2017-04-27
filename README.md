# psibi.in
[![Build Status](https://travis-ci.org/psibi/psibi.github.io.svg?branch=source)](https://travis-ci.org/psibi/psibi.github.io)

My website's source

# Build

``` shellsession
stack build
```

# Preview the website

``` shellsession
stack exec psibi.in -- preview
```

# To do deployment

``` shellsession
stack exec psibi.in -- build
./sync.sh .
```

