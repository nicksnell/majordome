# majordome

> Github Pull Request notification utility

![Notification](assets/notification.jpg)

Majordome is a simple cli program to generate notifications if you have
open/outstanding pull-request reviews on Github. It can also be used to
display the pull-requests on the command line.

The notifications are linked to the search in the format:

`type:pr is:open review:required review-requested:<username>`

### Install & Setup

Installing:

`npm install -g majordome`

Setup:

- Majordome requires a github token to be present in your home directory
 `~/.github`
- Generate a Github token, the permissions required will depend on what
you want to monitor in your account.
- Add token to `~/.github`


### Interface

`majordome check`

Check for outstanding PR reviews, if there are more than 0 a notification
will be triggered.

`majordome list`

List all the outstanding PR reviews. The will be grouped by repository
and the title along with the age of the PR will be displayed. Depending
on the terminal, these can also be used as links - typically holding
Command (OSX) whilst clicking will trigger the link to open (Terminal.app,
iTerm, etc..)


### Install a schedule

On Linux/Unix, a simple crontab is probably the best way to run this. On OSX
you can use `launchctl`. As there are a couple of tricky bits involved,
you can run `sudo majordome osx-install` - this will generate the plist file
and attempt to load it into `launchctl` (sudo is needed to write
to ~/Library/LaunchAgents)

To check it's installed, run:

`launchctl list | grep majordome`

If you don't see any results, it may not of loaded correctly, a command will of
been displayed when running the `osx-install` command. Yuo can run this to
attempt to reinstall, it is in the format
`launchctl load -w ~/Library/LaunchAgents/dev.nicksnell.majordome.plist`.

Default interval is 3600 (1 Hour), `osx-install` takes an `-i` or `--interval`
argument to customise.

You can unload the schedule at any time by running:

`launchctl unload ~/Library/LaunchAgents/dev.nicksnell.majordome.plist`
