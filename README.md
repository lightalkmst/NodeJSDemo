# skeleton (in-progress)

A functional programming framework wrapper around AngularJS v2.0, NodeJS, and MySQL to facilitate rapid setup and development of RESTful API web applications via automatic adaptation to additional assets to the project to reduce overhead of expansion and integration.


Features:

- Functional programming!
  - Inversion of control is implemented without reflection
    - More predictability in how your code will be executed
    - No annotations required
      - Understandable raw code
- Automatically includes files added to the project
  - Bundles and delivers JavaScript files so that all files are automatically delivered to the frontend
    - Function hook for angular components to be added to the angular router on the frontend
      - Adding a new component does not require syncing across multiple files, or even multiple sites
- Accepts production mode for frontend in configuration file


Developed with the functional programming paradigm, including currying, pointless style, and inversion of control to minimize boilerplate and increase abstraction, security, and provability.

(Multithreading and MySQL not included yet)

To run:
Install NodeJS v6.x and NPM
> npm install

> npm start
