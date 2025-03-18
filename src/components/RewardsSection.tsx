import { rewardStyles } from '../styles';
import Image from 'next/image';

interface Reward {
  id: string
  name: string
  credits: number
  claimed: boolean
  imgUrl?: string
  amazonUrl?: string
}

interface RewardsSectionProps {
  totalCredits: number
  rewards: Reward[]
  onClaimReward: (rewardId: string) => void
  showHeaderOnly?: boolean
}

export default function RewardsSection({
  totalCredits,
  rewards,
  onClaimReward,
  showHeaderOnly = true
}: RewardsSectionProps) {
  // Calculate available and claimed rewards
  const claimedRewards = rewards.filter(r => r.claimed)
  const totalClaimedCredits = claimedRewards.reduce((sum, r) => sum + r.credits, 0)
  const lifetimeCredits = totalCredits + totalClaimedCredits;

  // Render function for concise reward items at the top
  const renderConciseRewards = () => {
    if (rewards.length === 0) {
      return <p className="text-sm italic">No rewards available</p>;
    }

    return (
      <div className="flex justify-evenly w-full items-center">
        {rewards.map((reward) => {
          if (reward.claimed) return null; // Skip claimed rewards in concise view
          const creditsNeeded = reward.credits - totalCredits;
          
          return (
            <div
              key={reward.id}
              style={rewardStyles.conciseRewardItem}
              title={reward.name}
              className="flex-1 flex items-center justify-center mx-2"
            >
              {reward.imgUrl ? (
                <a 
                  href={reward.amazonUrl || "#"} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={(e) => !reward.amazonUrl && e.preventDefault()}
                >
                  <Image 
                    src={reward.imgUrl} 
                    alt={reward.name} 
                    width={40}
                    height={40}
                    className="object-cover mr-1 rounded-sm cursor-pointer" 
                    title={reward.amazonUrl ? "Click to view on Amazon" : reward.name}
                  />
                </a>
              ) : (
                <span className="font-bold mr-1">{reward.name}:</span>
              )}
              <span className="text-sm" style={rewardStyles.creditsNeededNotification}>
                need {creditsNeeded > 0 ? `${creditsNeeded} more` : 'no more'} credits
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  // Original detailed render function for reward items
  const renderRewardsList = () => {
    if (rewards.length === 0) {
      return <p className="text-sm italic">No rewards available</p>;
    }

    return (
      <div className="space-y-3">
        {rewards.map((reward) => {
          const canClaim = !reward.claimed && totalCredits >= reward.credits;
          
          return (
            <div
              key={reward.id}
              className={`flex items-center justify-between p-4 rounded-lg shadow-sm border ${
                reward.claimed 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-gray-100'
              }`}
            >
              <div className="flex items-center">
                {reward.imgUrl && (
                  <a 
                    href={reward.amazonUrl || "#"} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={(e) => !reward.amazonUrl && e.preventDefault()}
                  >
                    <Image 
                      src={reward.imgUrl} 
                      alt={reward.name} 
                      width={64}
                      height={64}
                      className={`object-cover mr-3 rounded-md ${reward.amazonUrl ? "cursor-pointer" : ""}`}
                      title={reward.amazonUrl ? "Click to view on Amazon" : reward.name}
                    />
                  </a>
                )}
                <div>
                  <h3 className="font-medium flex items-center text-lg">
                    {reward.claimed && <span className="text-green-500 mr-2">✓</span>}
                    {reward.name}
                  </h3>
                  <p className="text-sm font-medium" style={rewardStyles.creditText}>
                    {reward.claimed 
                      ? `${reward.credits} credits used` 
                      : <span style={rewardStyles.creditNeededBadge}>{reward.credits} credits needed</span>
                    }
                  </p>
                </div>
              </div>
              <div>
                {reward.claimed ? (
                  // Already claimed - show unclaim button
                  <button
                    onClick={() => onClaimReward(reward.id)}
                    className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Return & Get Credits Back
                  </button>
                ) : canClaim ? (
                  // Can claim - show claim button
                  <button
                    onClick={() => onClaimReward(reward.id)}
                    className="bg-purple-600 text-white hover:bg-purple-700 px-4 py-2 rounded-lg text-sm font-bold"
                  >
                    Claim Reward
                  </button>
                ) : (
                  // Can't claim - show credits needed
                  <div className="text-sm px-4 py-2 rounded-lg" style={rewardStyles.creditsNeededNotification}>
                    Need {reward.credits - totalCredits} more credits
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Concise Rewards Display at the top */}
      <div className="mb-4">
        <div className="flex items-center mb-2">
          <h2 className="text-xl font-semibold mr-2">Rewards</h2>
          <span className="text-sm text-gray-500">(Total <span className="font-bold">{lifetimeCredits}</span> credits earned, <span className="font-bold">{totalClaimedCredits}</span> used)</span>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderConciseRewards()}
        </div>
      </div>
      
      {/* Only show detailed sections if not in header-only mode */}
      {!showHeaderOnly && (
        <>
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-semibold">Credits Overview</h2>
            <div className="bg-purple-100 px-3 py-2 rounded-full">
              <div className="text-sm text-purple-800 font-bold">
                <span>{totalCredits}</span> Credits Available
              </div>
            </div>
          </div>
          
          {/* Credit Summary */}
          <div className="bg-gray-50 p-3 rounded-lg text-sm grid grid-cols-3 gap-2">
            <div className="text-center">
              <div className="font-bold text-purple-900 text-lg">{lifetimeCredits}</div>
              <div className="font-medium">Total Earned</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-green-600 text-lg">{totalCredits}</div>
              <div className="font-medium">Available</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-blue-600 text-lg">{totalClaimedCredits}</div>
              <div className="font-medium">Claimed</div>
            </div>
          </div>

          {/* Detailed Rewards Section */}
          <div className="space-y-2">
            <h3 className="text-lg font-medium">Reward Details:</h3>
            {renderRewardsList()}
          </div>
        </>
      )}
    </div>
  )
} 