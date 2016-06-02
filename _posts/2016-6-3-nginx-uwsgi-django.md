---
layout: post
title: Deploy Django project with uWSGI and Nginx
---

Follow the instructions of this tutorial: http://uwsgi-docs.readthedocs.org/en/latest/tutorials/Django_and_nginx.html

### In brief:
**uWSGI** is a **WSGI** implementation. We set up uWSGI so that it creates a **Unix socket**, and serves responses to the **web server(Nginx)** via the WSGI protocol. The complete stack of components looks like this:

    the web client(your browser) <-> the web server(Nginx) <-> the socket <-> uwsgi <-> Django
Install **uWSGI**, **Nginx**, **Pip** and **virtualenv** (I run the commands below as root):

    apt-get update

Install and start nginx:

    apt-get install nginx
    /etc/init.d/nginx start

Install pip and virtualenv:

    apt-get install python-pip
    pip install virtualenv
    cd chevy_forum
    source venv/bin/activate   # enter virtual environment

Install uWSGI:

    pip install uwsgi

### Configure nginx for our site:
Copy the **uwsgi_params** file available in nginx directory to chevy_forum/example/ folder

Create the file below in nginx sites-enabled/ folder, and remove default file

    # chevy_forum_nginx.conf

    # the upstream component nginx needs to connect to
    upstream django {
        server unix:///root/chevy_forum/example/chevy_forum.sock; # for a file socket
        # server 127.0.0.1:8001; # for a web port socket (we'll use this first)
    }

    # configuration of the server
    server {
        # the port your site will be served on
        listen      80;
        # the domain name it will serve for
        server_name 121.40.154.189; # substitute your machine's IP address or FQDN
        charset     utf-8;

        # max upload size
        client_max_body_size 75M;   # adjust to taste

        # Django media
        location /media  {
            alias /root/chevy_forum/example/media;  # your Django project's media files - amend as required
        }

        location /static {
            alias /root/chevy_forum/example/static; # your Django project's static files - amend as required
        }

        # Finally, send all non-media requests to the Django server.
        location / {
            uwsgi_pass  django;
            include     /root/chevy_forum/example/uwsgi_params; # the uwsgi_params file you installed
        }
    }

Then restart nginx: `/etc/init.d/nginx restart`

###Configuring uWSGI to run with a .ini file:
Create file chevy_uwsgi.ini below in chevy_forum/example/ folder:

    # chevy_uwsgi.ini file
    [uwsgi]

    # Django-related settings
    # the base directory (full path)
    chdir           = /root/chevy_forum/example
    # Django's wsgi file
    module          = project.wsgi
    # the virtualenv (full path)

    # process-related settings
    # master
    master          = true
    pidfile         = /tmp/chevy_forum-master.pid
    # maximum number of worker processes
    processes       = 10
    # the socket (use the full path to be safe
    socket          = /root/chevy_forum/example/chevy_forum.sock
    # ... with appropriate permissions - may be needed
    chmod-socket    = 666
    # clear environment on exit
    vacuum          = true
    daemonize       = /var/log/uwsgi/chevy_forum.log

And run uswgi using this file: `uwsgi --ini chevy_uwsgi.ini # the --ini option is used to specify a file`

You may need to fix some file/folder permission issues.