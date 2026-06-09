package services

import (
	"time"
)

const DeadlineOffset = 15 * time.Minute

func GetDeadline(kickoffUTC time.Time) time.Time {
	return kickoffUTC.Add(-DeadlineOffset)
}

func IsPastDeadline(kickoffUTC time.Time) bool {
	return time.Now().UTC().After(GetDeadline(kickoffUTC))
}
