---
layout: post
title: Exim自己搭邮件服务器
---

### Install and configure [Exim](http://www.exim.org/)
Issue the following commands to update your package repositories, upgrade your system, and install [Exim](http://www.exim.org/):
```
$apt-get update
$apt-get upgrade
$apt-get install exim4-daemon-light mailutils
```

Now you’re ready to configure Exim for local or remote mail service.
Enter the following command to start Exim configuration:
```
$dpkg-reconfigure exim4-config
```
The user interface will be displayed to let you configure many parameters. Choose these config options:

1. General type of mail configuration: **`internet site; mail is sent and received directly using SMTP`**
2. System mail name: Enter FQDN, ie. **`hostname.yourdomain.tld`**
3. IP-address to listen on for incoming SMTP connections:  **`127.0.0.1`** for local, **`<leave blank>`** for remote connections
4. Other destinations for which mail is accepted:   **`FQDN; local hostname; localhost.localdomain;localhost`**
5. Domains to relay mail for: **`remote server ip`**
6. Machines to relay mail for: **`<leave blank>`**
7. Keep number of DNS-queries minimal (Dial-on-Demand)? **No**
9. Delivery method for local mail: **`Maildir format in home directory`**
10. Split configuration file into small files? **No**

All the parameters you configure in the user interface are stored in `/etc/exim4/update-exim4.conf` file. If you wish to re-configure, either you re-run the configuration wizard or manually edit this file using your favorite editor. Once you configure, you can run the following command to generate the master configuration file:
```
$update-exim4.conf
# You can run the following command to restart Exim4 daemon.
$service exim4 restart
```

### Test Your Mail Configuration
on the mail server
```
$echo "This is a test." | mail -s Testing someone@somedomain.com
```

### Django configurations for connecting to this exim mail server:

```
# Email settings
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'

# Host for sending e-mail.
EMAIL_HOST = 'chevy-staging.prvalue.cn'

# Port for sending e-mail.
EMAIL_PORT = 25
```